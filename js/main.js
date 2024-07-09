//GLOBAL VARIABLES//
const blofin = new ccxt.blofin();
const bybit = new ccxt.pro.bybit()
let tickerList = [];
const tickerSelect = document.getElementById("ticker-select");
let currentTickerInstance = null;
let container = document.querySelector("#chart");
const savedFavorites = JSON.parse(localStorage.getItem("favorites")) || {};


class Ticker {
  constructor(symbol="BTC/USDT:USDT") {
    this.symbol = symbol;
    this.chart=null;
    this.fetchTimer = null;
  }

  async fetchBitcoinPrice() {
    try {
      const ticker = await blofin.fetchTicker(this.symbol);
      // while (1>0) {
      //   let ohlcv2 = await bybit.watchOHLCV(this.symbol)
      //   console.log(ohlcv2)
      // }

      document.getElementById(
        "coin-stats"
      ).innerText = `$${ticker.info.instId} Statistics`;
      const statsList = document.getElementById("stats");
      statsList.innerHTML = "";

      Object.entries(ticker).forEach(([key, value]) => {
        const li = document.createElement("li");
        if (value !== undefined && key !== "info") {
          li.textContent = `${capitalizeWords(key)}: ${value}`;
          statsList.appendChild(li);
        }
      });
    } catch (error) {
      console.error("Error fetching ticker:", error);
      document.getElementById("coin-stats").innerText =
        "Error fetching price. Please try again.";
    }
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer)
    }
    this.fetchTimer = setTimeout(() => this.fetchBitcoinPrice(), 500);
  }

  async generateAllData () {
    await clearChartContainer(container);
    await this.populateChart(this.symbol);
    await this.fetchBitcoinPrice(this.symbol);
  }

  async fetchCandles() {
    try {
      let ohlcv = blofin.fetchOHLCV(this.symbol, "1D");

      return ohlcv;
    } catch (error) {
      console.log(error);
    }
  }

  async  populateChart() {
    if (!this.chart) {
      this.chart = LightweightCharts.createChart(
        document.getElementById("chart")
      );
      const candleStickData = await this.fetchCandles(this.symbol);
      let candles = await mapCandlestickData(candleStickData);
      const mainSeries = this.chart.addCandlestickSeries();
      mainSeries.setData(candles);
      this.chart.timeScale().fitContent();
    }
  }
  clearInstance() {
    if (this.fetchTimer) {
      clearTimeout(this.fetchTimer);
      this.fetchTimer = null;
    }
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
  }
}


// let cryptoCoin = new Ticker(tickerValue)
// await cryptoCoin.generateAllData()

//////////////////////////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", async (event) => {
  let cryptoCoin = new Ticker()
  await cryptoCoin.generateAllData()
});




async function fetchTickers() {
  try {
    let tickers = await blofin.fetchMarkets();
    tickers = tickers.sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });

    tickerSelect.innerHTML = `<option value="">Select a ticker</option>`;

    tickers.forEach((ticker) => {
      const option = document.createElement("option");
      option.value = ticker.id.split("-")[0];
      option.textContent = ticker.symbol.split("/")[0];
      tickerSelect.appendChild(option);
      tickerList.push(ticker.symbol);
    });
  } catch (error) {
    console.log(error);
  }
}



async function mapCandlestickData(data) {
  return data.map((candle) => ({
    time: new Date(candle[0]).toISOString().replace("T", " ").split(".")[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
  }));
}

async function clearChartContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function capitalizeWords(str) {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}



async function fillNavBar(list) {
  await fetchTickers();
  list = new Set(list);
  const legend = document.querySelector("#ticker-nav");
  Array.from(legend.querySelectorAll("li")).forEach((li) => li.remove());

  list.forEach((ticker) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = ticker.split("/")[0];
    a.addEventListener("click", async function (event) {
      event.preventDefault();
      // tickerValue = ticker;
      if (currentTickerInstance) {
        currentTickerInstance.clearInstance();
        currentTickerInstance = null;
      }
      currentTickerInstance = new Ticker(ticker);
      await currentTickerInstance.generateAllData();
    });

    const star = document.createElement("i");
    star.classList.add("fa", "fa-star");
    star.style.marginLeft = "10px";

    if (savedFavorites[ticker]) {
      star.classList.add("fas");
    } else {
      star.classList.add("far");
    }

    star.addEventListener("click", function (event) {
      event.stopPropagation();
      if (star.classList.contains("fas")) {
        star.classList.remove("fas");
        star.classList.add("far");
        delete savedFavorites[ticker];
      } else {
        star.classList.remove("far");
        star.classList.add("fas");
        savedFavorites[ticker] = true;
      }
      localStorage.setItem("favorites", JSON.stringify(savedFavorites));
    });
    li.appendChild(star);
    li.appendChild(a);
    legend.appendChild(li);
  });
}

document
  .getElementById("legend-list")
  .addEventListener("change", async function (event) {
    if (event.target.value === "Favorites") {
      let favoriteList = tickerList.filter((ticker) => savedFavorites[ticker]);
      await fillNavBar(favoriteList);
    } else {
      await fillNavBar(tickerList);
    }
  });

fillNavBar(tickerList);

