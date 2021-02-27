import { metadata } from './metadata'

const querystring = require('querystring')
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


const ABI_AMB_LAYER1 = [
  "event RelayedMessage(address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
  "event AffirmationCompleted( address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
]

const ABI_AMB_LAYER2 = [
  "event AffirmationCompleted( address indexed sender, address indexed executor, bytes32 indexed messageId, bool status)",
]

const xDaiUrl = "https://xdai.poanetwork.dev"
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

const layer2Usdc = new Contract(xUsdcAddr, Erc20TokenArtifact.abi, layer2Wallet)


const clearingHouse = new Contract(clearingHouseAddr, ClearingHouseArtifact.abi, layer2Wallet)
const clearingHouseViewer = new Contract(chViewerAddr, CHViewerArtifact.abi, layer2Wallet)
const layer2Amb = new Contract(layer2AmbAddr, ABI_AMB_LAYER2, layer2Wallet)
const layer2Bridge = new Contract(layer2BridgeAddr, ClientBridgeArtifact.abi, layer2Wallet)

const symbols = ['BTC', 'ETH', 'DOT', 'LINK']
const symbol_to_id = {
    'BTC': 0,
    'ETH': 1,
    'DOT': 2,
    'LINK': 3
}
const ammAddrs = symbols.map(symbol => metadata.layers.layer2.contracts[symbol + 'USDC'].address)
const amms = ammAddrs.map(ammAddr => new Contract(ammAddr, AmmArtifact.abi, layer2Wallet))

const ammReaderAddr = metadata.layers.layer2.contracts.AmmReader.address
const ammReader = new Contract(ammReaderAddr, AmmReaderArtifact.abi, layer2Wallet)

export async function getMarkPrice(symbol) {
  let id = symbol_to_id[symbol]
  let ammInfo = await ammReader.getAmmStates(amms[id].address)
  let quoteAssetReserve = ammInfo[0].div(BigNumber.from("1000000000000000000")).toNumber()
  let baseAssetReserve = ammInfo[1].div(BigNumber.from("1000000000000000000")).toNumber()
  let price = quoteAssetReserve / baseAssetReserve
  return price
}