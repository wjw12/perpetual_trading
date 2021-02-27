const fetch = require("cross-fetch")
const https = require('https')
export function getBinancePrice(symbol) {
    const promise=new Promise(function (resolve, reject) {
        const req=https.get(`https://dapi.binance.com/dapi/v1/ticker/price?symbol=${symbol}_PERP`, (res) => {

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