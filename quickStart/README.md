# a quick start guide before you running the trading bot

1. Register an [Infura](https://infura.io/) node.
2. Setup environment variables. For Linux user, just run `export export PRIVATE_KEY={YOUR_PRIVATE_KEY}` and `export INFURA_PROJECT_ID={YOUR_PROJECT_ID}`. You may use `echo $PRIVATE_KEY $INFURA_PROJECT_ID` to check the setup.
3. Run `npm install dotenv --save` and `npm install cross-fetch ethers @perp/contract`.
4. Run `node printBalances.js`. It will show you the wallet address and balances in layer 1 and layer 2.
5. Before you start the trading, make sure you have enough funds of xDai and USDC in layer 2. Each contract call will consume about 0.0004 xDai. You may ask someone to transfer some xDai to your wallet address. To transfer USDC from layer 1 to layer 2, please follow [this tutorial](https://docs.perp.fi/tutorials/get-started-on-perp.exchange).
6. Now you can start trade! Run `node long10U-ETH.js` will open a long position with a margin of 10 and 1x leverage in ETH/USDC market.
7. Finally,  waiting for the right moment and run `node closePosition.js` to close this test position. You will see some change of USDC balance in layer 2.
8. Congratulations! You can start the trading bot now.

