import { wechat_push } from './wechat_push'
import { getBinancePrice } from './binance_price'
import { getMarkPrice } from './perpetual_price'
const querystring = require('querystring')


const alert_price_difference = 0.02

const symbols = ['BTC', 'ETH', 'DOT', 'LINK']

var lastNotified = {}

symbols.forEach(symbol => lastNotified[symbol] = 0)

async function tick() {
    
    try {
        
    
    symbols.forEach(async function(symbol) {
        let mark_price = await getMarkPrice(symbol)
        let binance_data = await getBinancePrice(symbol + 'USD')
        let price_difference = (binance_data["price"] - mark_price) / mark_price
       console.log(symbol + " mark price =", mark_price, " binance price=", binance_data["price"])
       console.log("alert price difference=", alert_price_difference*100, " price difference=", price_difference*100)
       
       if (Math.abs(price_difference) > alert_price_difference && Date.now() - lastNotified[symbol] > 1000 * 60 * 10) {
           lastNotified[symbol] = Date.now()
           const postData = querystring.stringify({
             'text': 'Abnormal Price Change',
             'desp': symbol + ' mark price = ' + mark_price + '\nbinance price = ' + binance_data["price"]
           })
           
           wechat_push(postData)
       }
    })
    
    }
    catch (e) {
        console.error(e)
    }
  
}

setInterval(tick, 10000)