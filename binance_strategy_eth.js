const fetch = require("cross-fetch")
const https = require('https')
const { Contract, Wallet, BigNumber, constants, providers } = require("ethers")
const AmmArtifact = require("@perp/contract/build/contracts/Amm.json")
const ClearingHouseArtifact = require("@perp/contract/build/contracts/ClearingHouse.json")
const RootBridgeArtifact = require("@perp/contract/build/contracts/RootBridge.json")
const ClientBridgeArtifact = require("@perp/contract/build/contracts/ClientBridge.json")
const CHViewerArtifact = require("@perp/contract/build/contracts/ClearingHouseViewer.json")
const Erc20TokenArtifact = require("@perp/contract/build/contracts/ERC20Token.json")
const AmmReaderArtifact = require("@perp/contract/build/contracts/AmmReader.json")
const { parseUnits, formatEther, formatUnits } = require("ethers/lib/utils")
require("dotenv").config()

const LONG_POS = 0
const SHORT_POS = 1
const DEFAULT_DECIMALS = 18
const PNL_OPTION_SPOT_PRICE = 0
const ORDER_AMOUNT = "1"
const LEVERAGE = 10


const ABI_AMB_LAYER1 = [
  "event RelayedMessage(address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
  "event AffirmationCompleted( address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
]

const ABI_AMB_LAYER2 = [
  "event AffirmationCompleted( address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
]

async function waitTx(txReq) {
  return txReq.then(tx => tx.wait(2)) // wait 2 block for confirmation
}

async function setupEnv() {
  const metadataUrl = "https://metadata.perp.exchange/production.json"
  const metadata = await fetch(metadataUrl).then(res => res.json())
  const xDaiUrl = "https://rpc.xdaichain.com/"
  const mainnetUrl = "https://mainnet.infura.io/v3/" + process.env.INFURA_PROJECT_ID
  const layer1Provider = new providers.JsonRpcProvider(mainnetUrl)
  const layer2Provider = new providers.JsonRpcProvider(xDaiUrl)
  const layer1Wallet = new Wallet(process.env.PRIVATE_KEY, layer1Provider)
  const layer2Wallet = new Wallet(process.env.PRIVATE_KEY, layer2Provider)
  console.log("wallet address", layer1Wallet.address)

  // layer 1 contracts
  const layer1BridgeAddr = metadata.layers.layer1.contracts.RootBridge.address
  const usdcAddr = metadata.layers.layer1.externalContracts.usdc
  const layer1AmbAddr = metadata.layers.layer1.externalContracts.ambBridgeOnEth

  const layer1Usdc = new Contract(usdcAddr, Erc20TokenArtifact.abi, layer1Wallet)
  const layer1Bridge = new Contract(layer1BridgeAddr, RootBridgeArtifact.abi, layer1Wallet)
  const layer1Amb = new Contract(layer1AmbAddr, ABI_AMB_LAYER1, layer1Wallet)

  // layer 2 contracts
  const layer2BridgeAddr = metadata.layers.layer2.contracts.ClientBridge.address
  const layer2AmbAddr = metadata.layers.layer2.externalContracts.ambBridgeOnXDai
  const xUsdcAddr = metadata.layers.layer2.externalContracts.usdc
  const clearingHouseAddr = metadata.layers.layer2.contracts.ClearingHouse.address
  const chViewerAddr = metadata.layers.layer2.contracts.ClearingHouseViewer.address
  const ammAddr = metadata.layers.layer2.contracts.ETHUSDC.address // can change to other address
  const ammReaderAddr = metadata.layers.layer2.contracts.AmmReader.address

  const layer2Usdc = new Contract(xUsdcAddr, Erc20TokenArtifact.abi, layer2Wallet)
  const amm = new Contract(ammAddr, AmmArtifact.abi, layer2Wallet)
  const clearingHouse = new Contract(clearingHouseAddr, ClearingHouseArtifact.abi, layer2Wallet)
  const clearingHouseViewer = new Contract(chViewerAddr, CHViewerArtifact.abi, layer2Wallet)
  const layer2Amb = new Contract(layer2AmbAddr, ABI_AMB_LAYER2, layer2Wallet)
  const layer2Bridge = new Contract(layer2BridgeAddr, ClientBridgeArtifact.abi, layer2Wallet)
  const ammReader = new Contract(ammReaderAddr, AmmReaderArtifact.abi, layer2Wallet)

  console.log("USDC address", usdcAddr)

  return {
    amm,
	ammReader,
    clearingHouse,
    layer1Usdc,
    layer2Usdc,
    layer1Wallet,
    layer2Wallet,
    clearingHouseViewer,
    layer1Bridge,
    layer2Bridge,
    layer1Amb,
    layer2Amb,
  }
}

async function printInfo(clearingHouseViewer, amm, wallet) {
  console.log("getting information")
  const position = await clearingHouseViewer.getPersonalPositionWithFundingPayment(
    amm.address,
    wallet.address,
  )
  const pnl = await clearingHouseViewer.getUnrealizedPnl(
    amm.address,
    wallet.address,
    BigNumber.from(PNL_OPTION_SPOT_PRICE),
  )

  console.log("- current position", formatUnits(position.size.d, DEFAULT_DECIMALS))
  console.log("- pnl", formatUnits(pnl.d, DEFAULT_DECIMALS))
}

async function printBalances(layer1Wallet, layer2Wallet, layer1Usdc, layer2Usdc) {
  // get ETH & USDC balance
  const ethBalance = await layer1Wallet.getBalance()
  const xDaiBalance = await layer2Wallet.getBalance()
  let layer1UsdcBalance = await layer1Usdc.balanceOf(layer1Wallet.address)
  let layer2UsdcBalance = await layer2Usdc.balanceOf(layer1Wallet.address)
  const layer1UsdcDecimals = await layer1Usdc.decimals()
  const layer2UsdcDecimals = await layer2Usdc.decimals()

  const outputs = [
    "balances",
    `- layer 1`,
    `  - ${formatEther(ethBalance)} ETH`,
    `  - ${formatUnits(layer1UsdcBalance, layer1UsdcDecimals)} USDC`,
    `- layer 2`,
    `  - ${formatEther(xDaiBalance)} xDAI`,
    `  - ${formatUnits(layer2UsdcBalance, layer2UsdcDecimals)} USDC`,
  ]
  console.log(outputs.join("\n"))
}


// below is the strategy
const MAX_ORDERS = 10
const GRID_DELTA = 10
const PRICE_DIFF_DELTA = 0.004
const FEE = 0.0011


var orders = []

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBinancePrice() {
    const promise=new Promise(function (resolve, reject) {
        const req=https.get('https://dapi.binance.com/dapi/v1/ticker/price?symbol=ETHUSD_PERP', (res) => {

          res.on('data', (d) => {
            const jsonObject = JSON.parse(d);
            resolve(jsonObject[0]);
          });

        }).on('error', (e) => {
         console.error(e);
         reject(e);
        });
    })
    return promise;
}

async function getMarkPrice(ammReader, amm) {
  let ammInfo = await ammReader.getAmmStates(amm.address)
  let quoteAssetReserve = ammInfo[0].div(BigNumber.from("1000000000000000000")).toNumber()
  let baseAssetReserve = ammInfo[1].div(BigNumber.from("1000000000000000000")).toNumber()
  let price = quoteAssetReserve / baseAssetReserve
  return price
}

async function openPosition(clearingHouse, amm, direction) {
  const quoteAssetAmount = {
    d: parseUnits(ORDER_AMOUNT, DEFAULT_DECIMALS),
  }
  const leverage = { d: parseUnits(LEVERAGE.toString(), DEFAULT_DECIMALS) }
  const minBaseAssetAmount = { d: "0" }
  await waitTx(
    clearingHouse.openPosition(
      amm.address,
      direction,
      quoteAssetAmount,
      leverage,
      minBaseAssetAmount,
	  {
        gasLimit: 2000000,
        gasPrice: 1000000000
      }
    ),
  )
}

var has_unfinished_order = false

async function execute_order(order, clearingHouse, clearingHouseViewer, amm, layer2Wallet) {
  if (has_unfinished_order) return
  try {
    has_unfinished_order = true
    await openPosition(clearingHouse, amm, order.direction)
    console.log("execute order", order)
	if (orders.length == 0) {
		orders.push(order)
	}
	else {
		if (orders[0].direction == order.direction) {
		    orders.push(order)
	    }
	    else {
	    	orders.pop()
	    }
	}
	has_unfinished_order = false
  }
  catch (e) {
    console.log("fail to execute order", order)
    console.error(e)
  }

  await printInfo(clearingHouseViewer, amm, layer2Wallet)
  
}

async function tick(ammReader, amm, clearingHouse, clearingHouseViewer, layer2Wallet) {
   let mark_price = await getMarkPrice(ammReader, amm)
   let binance_data = await getBinancePrice();
   let price_difference = (binance_data["price"] - mark_price) / mark_price
   console.log("mark price =", mark_price, " binance price=", binance_data["price"], " price difference=", price_difference*100)
   
   if (orders.length == 0) { //there's no orders now
	   if (Math.abs(price_difference) > PRICE_DIFF_DELTA) { // open a position
		   let order = {
               price: mark_price,
               price_difference: price_difference,
			   direction: price_difference>0 ? LONG_POS : SHORT_POS
           }
		   execute_order(order, clearingHouse, clearingHouseViewer, amm, layer2Wallet)
	   }
   }
   else {
	   // reduce positions
	   let current_order = orders[orders.length-1]
	   if (current_order.direction == LONG_POS) {
		   if ((mark_price>current_order.price+GRID_DELTA && price_difference<current_order.price_difference-PRICE_DIFF_DELTA) || (mark_price>current_order.price*(1+FEE) && price_difference<0)) {
			   if (orders.length == 1) {
				   console.log("closing position")
                   await waitTx(clearingHouse.closePosition(amm.address, { d: "0" }))
                   await printInfo(clearingHouseViewer, amm, layer2Wallet)
				   orders.pop()
			   }
			   else {
				   let order = {
                       price: mark_price,
                       price_difference: price_difference,
			           direction: SHORT_POS
                    }
		            execute_order(order, clearingHouse, clearingHouseViewer, amm, layer2Wallet)
			   }
			   
		   }
	   }
	   else {
		   if ((mark_price<current_order.price-GRID_DELTA && price_difference>current_order.price_difference+PRICE_DIFF_DELTA) || (mark_price<current_order.price*(1-FEE) && price_difference>0)) {
			   if (orders.length == 1) {
				   console.log("closing position")
                   await waitTx(clearingHouse.closePosition(amm.address, { d: "0" }))
                   await printInfo(clearingHouseViewer, amm, layer2Wallet)
				   orders.pop()
			   }
			   else {
				   let order = {
                       price: mark_price,
                       price_difference: price_difference,
			           direction: LONG_POS
                    }
		            execute_order(order, clearingHouse, clearingHouseViewer, amm, layer2Wallet)
			   }
		   }
	   }
	   // add more positions
	   if (orders.length < MAX_ORDERS) { 
		   if (current_order.direction == LONG_POS) {
			   if ((mark_price<current_order.price-GRID_DELTA && price_difference>0) || (mark_price<current_order.price && price_difference>current_order.price_difference+PRICE_DIFF_DELTA)) {
				   let order = {
                       price: mark_price,
                       price_difference: price_difference,
			           direction: LONG_POS
                   }
		           execute_order(order, clearingHouse, clearingHouseViewer, amm, layer2Wallet)
			   }
		   }
		   else {
			   if ((mark_price>current_order.price+GRID_DELTA && price_difference<0) || (mark_price>current_order.price && price_difference<current_order.price_difference-PRICE_DIFF_DELTA)) {
				   let order = {
                       price: mark_price,
                       price_difference: price_difference,
			           direction: SHORT_POS
                   }
		           execute_order(order, clearingHouse, clearingHouseViewer, amm, layer2Wallet)
			   }
		   }
	   }
   }
}

async function main() {
  const {
    amm,
	ammReader,
    clearingHouse,
    layer1Usdc,
    layer2Usdc,
    layer1Wallet,
    layer2Wallet,
    clearingHouseViewer,
    layer1Bridge,
    layer2Bridge,
    layer1Amb,
    layer2Amb,
  } = await setupEnv()

  await printBalances(layer1Wallet, layer2Wallet, layer1Usdc, layer2Usdc)
  
  while (true) {
    try {
        await tick(ammReader, amm, clearingHouse, clearingHouseViewer, layer2Wallet)
    }
    catch (e) {
        console.error(e)
    }
    await sleep(5000)
  }

}

main()