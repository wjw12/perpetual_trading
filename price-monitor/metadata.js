export const metadata = {
  "layers": {
    "layer1": {
      "contracts": {
        "RootBridge": {
          "name": "RootBridge",
          "address": "0xA51156F3F1e39d1036Ca4ba4974107A1C1815d1e"
        },
        "ChainlinkL1": {
          "name": "ChainlinkL1",
          "address": "0x05b1d5B3ad20769B3b71b658A1Df2290CD5A2376"
        },
        "PerpRewardNoVesting": {
          "name": "PerpRewardVesting",
          "address": "0xc523D13685a0EAdEd0d673a3755EB9888C2eB9a1"
        },
        "PerpRewardTwentySixWeeksVesting": {
          "name": "PerpRewardVesting",
          "address": "0xf4EC90Db4713d199a756c18069CD4BB4bf4b3E26"
        }
      },
      "accounts": [],
      "network": "homestead",
      "externalContracts": {
        "foundationGovernance": "0x5E4B407eB1253527628bAb875525AaeC0099fFC5",
        "rewardGovernance": "0x9FE5f5bbbD3f2172Fa370068D26185f3d82ed9aC",
        "perp": "0xbc396689893d065f41bc2c6ecbee5e0085233447",
        "usdc": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "tether": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "ambBridgeOnEth": "0x4C36d2919e407f0Cc2Ee3c993ccF8ac26d9CE64e",
        "multiTokenMediatorOnEth": "0x88ad09518695c6c3712AC10a214bE5109a655671",
        "proxyAdmin": "0x29853EcF31eaedcD9074a11A85A8C8b689165F0b"
      }
    },
    "layer2": {
      "contracts": {
        "MetaTxGateway": {
          "name": "MetaTxGateway",
          "address": "0xA51156F3F1e39d1036Ca4ba4974107A1C1815d1e"
        },
        "ClientBridge": {
          "name": "ClientBridge",
          "address": "0x05b1d5B3ad20769B3b71b658A1Df2290CD5A2376"
        },
        "InsuranceFund": {
          "name": "InsuranceFund",
          "address": "0x8C29F6F7fc1999aB84b476952E986F974Acb3824"
        },
        "L2PriceFeed": {
          "name": "L2PriceFeed",
          "address": "0xb0C0387bC0eBe8C8A6Cc7f089B12aB1a063AAfFb"
        },
        "ClearingHouse": {
          "name": "ClearingHouse",
          "address": "0x5d9593586b4B5edBd23E7Eba8d88FD8F09D83EBd"
        },
        "ETHUSDC": {
          "name": "Amm",
          "address": "0x8d22F1a9dCe724D8c1B4c688D75f17A2fE2D32df"
        },
        "BTCUSDC": {
          "name": "Amm",
          "address": "0x0f346e19F01471C02485DF1758cfd3d624E399B4"
        },
        "ClearingHouseViewer": {
          "name": "ClearingHouseViewer",
          "address": "0xef8093561D193d24b7677F784e41A10714E7FE25"
        },
        "AmmReader": {
          "name": "AmmReader",
          "address": "0x2FA2c9B377D9e152d52A42bcc403022baCb2aF05"
        },
        "YFIUSDC": {
          "name": "Amm",
          "address": "0xd41025350582674144102B74B8248550580bb869"
        },
        "DOTUSDC": {
          "name": "Amm",
          "address": "0x6de775aaBEEedE8EFdB1a257198d56A3aC18C2FD"
        },
        "SNXUSDC": {
          "name": "Amm",
          "address": "0xb397389B61cbF3920d297b4ea1847996eb2ac8E8"
        },
        "LINKUSDC": {
          "name": "Amm",
          "address": "0x80DaF8ABD5a6Ba182033B6464e3E39A0155DCC10"
        },
        "AAVEUSDC": {
          "name": "Amm",
          "address": "0x16A7ECF2c27Cb367Df36d39e389e66B42000E0dF"
        }
      },
      "accounts": [],
      "network": "xdai",
      "externalContracts": {
        "foundationGovernance": "0x371D128A0a286800d3A5E830F1D26dFf237A3279",
        "arbitrageur": "0x1A48776f436bcDAA16845A378666cf4BA131eb0F",
        "usdc": "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
        "tether": "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
        "ambBridgeOnXDai": "0x75Df5AF045d91108662D8080fD1FEFAd6aA0bb59",
        "multiTokenMediatorOnXDai": "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d",
        "proxyAdmin": "0x29853EcF31eaedcD9074a11A85A8C8b689165F0b"
      }
    }
  }
}