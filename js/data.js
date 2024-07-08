async function watchTicker () {
    console.log(ccxt.exchanges)
    let blofin = new ccxt.binance()
    let ohlcv = await blofin.watchOHLCV()
    console.log(ohlcv)
}
watchTicker()