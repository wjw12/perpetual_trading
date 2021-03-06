const fetch = require("cross-fetch")
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


const DEFAULT_DECIMALS = 18
const PNL_OPTION_SPOT_PRICE = 0


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


async function setupEnv(trading_pair) {
  const metadataUrl = "https://metadata.perp.exchange/production.json"
  const metadata = await fetch(metadataUrl).then(res => res.json())
  const layer1Provider = new providers.JsonRpcProvider(process.env.MAINNET_RPC_URL)
  const layer2Provider = new providers.JsonRpcProvider(process.env.XDAI_URL)
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
  
  const ammAddr = metadata.layers.layer2.contracts[trading_pair].address // Change this
  
  const ammReaderAddr = metadata.layers.layer2.contracts.AmmReader.address

  const layer2Usdc = new Contract(xUsdcAddr, Erc20TokenArtifact.abi, layer2Wallet)
  const amm = new Contract(ammAddr, AmmArtifact.abi, layer2Wallet)
  const clearingHouse = new Contract(clearingHouseAddr, ClearingHouseArtifact.abi, layer2Wallet)
  const clearingHouseViewer = new Contract(chViewerAddr, CHViewerArtifact.abi, layer2Wallet)
  const layer2Amb = new Contract(layer2AmbAddr, ABI_AMB_LAYER2, layer2Wallet)
  const layer2Bridge = new Contract(layer2BridgeAddr, ClientBridgeArtifact.abi, layer2Wallet)
  const ammReader = new Contract(ammReaderAddr, AmmReaderArtifact.abi, layer2Wallet)

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

async function openPosition(clearingHouse, amm, direction, amount, leverage, decimals) {
  if (!decimals) decimals = DEFAULT_DECIMALS
  const quoteAssetAmount = { d: parseUnits(amount.toString(), decimals) }
  leverage = { d: parseUnits(leverage.toString(), decimals) }
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

async function printInfo(clearingHouseViewer, amm, wallet) {
  console.log("getting position information")
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
  console.log(outputs.join("\\n"))
}

async function waitCrossChain(action, receipt, layer1Amb, layer2Amb) {
  let methodId
  let eventName
  let amb

  if (action === ACTION_DEPOSIT) {
    methodId = "0x482515ce" // UserRequestForAffirmation
    eventName = "AffirmationCompleted"
    amb = layer2Amb
  } else if (action === ACTION_WITHDRAW) {
    methodId = "0x520d2afd" // UserRequestForSignature
    eventName = "RelayedMessage"
    amb = layer1Amb
  } else {
    throw new Error("unknown action: " + action)
  }

  return new Promise(async (resolve, reject) => {
    if (receipt && receipt.logs) {
      const matched = receipt.logs.filter(log => log.topics[0].substr(0, 10) === methodId)
      if (matched.length === 0) {
        return reject("methodId not found: " + methodId)
      }
      const log = matched[0]
      const fromMsgId = log.topics[1]
      console.log("msgId from receipt", fromMsgId)
      amb.on(eventName, (sender, executor, toMsgId, status, log) => {
        console.log("got event", toMsgId)
        if (fromMsgId === toMsgId) {
          amb.removeAllListeners(eventName)
          resolve(log.transactionHash)
        }
      })
    } else {
      reject("receipt or log not found")
    }
  })
}

async function getMarkPrice(ammReader, amm) {
  var ammInfo = await ammReader.getAmmStates(amm.address)
  var quoteAssetReserve = ammInfo[0].div(BigNumber.from("1000000000000000000")).toNumber()
  var baseAssetReserve = ammInfo[1].div(BigNumber.from("1000000000000000000")).toNumber()
  var price = quoteAssetReserve / baseAssetReserve
  return price
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

  // get ETH & USDC balance
  let layer1UsdcBalance = await layer1Usdc.balanceOf(layer1Wallet.address)

  await printBalances(layer1Wallet, layer2Wallet, layer1Usdc, layer2Usdc)

  await printInfo(clearingHouseViewer, amm, layer2Wallet)
  
  var mark_price = await getMarkPrice(ammReader, amm)
  console.log("price =", mark_price)
}