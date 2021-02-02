const fetch = require("cross-fetch")
const { Contract, Wallet, BigNumber, constants, providers } = require("ethers")
const AmmArtifact = require("@perp/contract/build/contracts/Amm.json")
const ClearingHouseArtifact = require("@perp/contract/build/contracts/ClearingHouse.json")
const RootBridgeArtifact = require("@perp/contract/build/contracts/RootBridge.json")
const ClientBridgeArtifact = require("@perp/contract/build/contracts/ClientBridge.json")
const CHViewerArtifact = require("@perp/contract/build/contracts/ClearingHouseViewer.json")
const Erc20TokenArtifact = require("@perp/contract/build/contracts/ERC20Token.json")
const { parseUnits, formatEther, formatUnits } = require("ethers/lib/utils")
require("dotenv").config()

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
  const ammAddr = metadata.layers.layer2.contracts.ETHUSDC.address

  const layer2Usdc = new Contract(xUsdcAddr, Erc20TokenArtifact.abi, layer2Wallet)
  const amm = new Contract(ammAddr, AmmArtifact.abi, layer2Wallet)
  const clearingHouse = new Contract(clearingHouseAddr, ClearingHouseArtifact.abi, layer2Wallet)
  const clearingHouseViewer = new Contract(chViewerAddr, CHViewerArtifact.abi, layer2Wallet)
  const layer2Amb = new Contract(layer2AmbAddr, ABI_AMB_LAYER2, layer2Wallet)
  const layer2Bridge = new Contract(layer2BridgeAddr, ClientBridgeArtifact.abi, layer2Wallet)

  console.log("USDC address", usdcAddr)

  return {
    amm,
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

async function main() {
  const {
    amm,
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

}

main()