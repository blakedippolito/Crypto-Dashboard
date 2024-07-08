//GLOBAL VARIABLES//
const blofin = new ccxt.blofin();
let tickerList = []

const tickerSelect = document.getElementById('ticker-select');
let tickerValue = ''
let container = document.querySelector('#chart')
const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || {}

// generateAllData(tickerValue)
document.addEventListener('DOMContentLoaded', () => {
  // Populate the ticker select dropdown with options
  populateTickerSelect();
  
  // Set initial ticker value and load data
  tickerSelect.value = tickerValue;
  generateAllData(tickerValue);
});

tickerSelect.addEventListener('change', (event) => {
  tickerValue = ''
  tickerValue = event.target.value;
  generateAllData(tickerValue);
});
async function generateAllData (ticker='BTC/USDT:USDT') {
  await clearChartContainer(container)
  await populateChart(ticker);
  await fetchBitcoinPrice(ticker)
  tickerValue= ''
}

async function fetchBitcoinPrice(tickerInput) {
  try {
      const ticker = await blofin.fetchTicker(tickerInput);

      document.getElementById('coin-stats').innerText = `$${ticker.info.instId} Statistics`;
      const statsList = document.getElementById('stats');
      statsList.innerHTML = '';

      Object.entries(ticker).forEach(([key, value]) => {
          const li = document.createElement('li');
          if (value !== undefined && key !== 'info') {
            li.textContent = `${capitalizeWords(key)}: ${value}`;
            statsList.appendChild(li);
          }

      });

  } catch (error) {
      console.error('Error fetching ticker:', error);
      document.getElementById('coin-stats').innerText = 'Error fetching price. Please try again.';
  }

  // Schedule the next fetch
  setTimeout(() => fetchBitcoinPrice(tickerInput), 500);
}

async function fetchTickers() {
    try {
        let tickers = await blofin.fetchMarkets();
        tickers = tickers.sort((a, b) => {
          if (a.id < b.id) return -1;
          if (a.id > b.id) return 1;
          return 0;
          
        });
        
        tickerSelect.innerHTML = `<option value="">Select a ticker</option>`;

        tickers.forEach(ticker => {
            const option = document.createElement('option');
            option.value = ticker.id.split('-')[0];
            option.textContent = ticker.symbol.split('/')[0];
            tickerSelect.appendChild(option);
            tickerList.push(ticker.symbol)
        });

    } catch (error) {
        console.log(error);
    }
}


function fetchCandles(ticker) {
  console.log(ticker)
    try {
        let ohlcv = blofin.fetchOHLCV(ticker, '1D', limit=200);
        return ohlcv;
    } catch (error) {
        console.log(error);
    }
}


async function populateChart (ticker) {
  let chart=null
  if (!chart) {
    let container = document.querySelector('#chart')
    const chart = LightweightCharts.createChart(
    document.getElementById('chart'));
    const candleStickData = await fetchCandles(ticker)
    let candles = mapCandlestickData(candleStickData)
    const mainSeries = chart.addCandlestickSeries();
    mainSeries.setData(candles);
    chart.timeScale().fitContent()
}
}

function mapCandlestickData(data) {
  return data.map(candle => ({
    time: new Date(candle[0]).toISOString().replace('T', ' ').split('.')[0],
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
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function matchInputList(list) {
  const input = document.querySelector('input');
  const autocompleteContainer = document.createElement('div');
  autocompleteContainer.classList.add('autocomplete-container');
  input.parentNode.appendChild(autocompleteContainer);

  input.addEventListener('input', function() {
      const value = input.value.toUpperCase();
      autocompleteContainer.innerHTML = ''; // Clear previous suggestions
      if (!value) return;

      if(value.length>=3) {
        const filteredList = list.filter(ticker => ticker.includes(value));
        filteredList.forEach(ticker => {
            const item = document.createElement('div');
            item.classList.add('autocomplete-item');
            item.textContent = ticker;
            item.addEventListener('click', function() {
                input.value = ticker;
                autocompleteContainer.innerHTML = ''; // Clear suggestions on selection
            });
            autocompleteContainer.appendChild(item);
        });

      }

  });
}
matchInputList(tickerList)



async function fillNavBar(list) {
  
  await fetchTickers()
  list = new Set(list)
  const legend = document.querySelector('#ticker-nav');
  Array.from(legend.querySelectorAll('li')).forEach(li => li.remove());

  list.forEach(ticker => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = "#";
      a.textContent = ticker.split('/')[0];
      a.addEventListener('click', async function(event) {
          // event.preventDefault();
          tickerValue = ticker
          await generateAllData(ticker)
      });

      const star = document.createElement('i');
      star.classList.add('fa', 'fa-star');
      star.style.marginLeft = '10px';
      
      
      if (savedFavorites[ticker]) {
          star.classList.add('fas');
      } else {
          star.classList.add('far');
      }

      star.addEventListener('click', function(event) {
          event.stopPropagation(); 
          if (star.classList.contains('fas')) {
              star.classList.remove('fas');
              star.classList.add('far');
              delete savedFavorites[ticker];
          } else {
              star.classList.remove('far');
              star.classList.add('fas');
              savedFavorites[ticker] = true;
          }
          localStorage.setItem('favorites', JSON.stringify(savedFavorites));
      });
      li.appendChild(star)
      li.appendChild(a);
      legend.appendChild(li);
  });
}

document.getElementById('legend-list').addEventListener('change', async function(event) {
  if (event.target.value === 'Favorites') {
    let favoriteList = tickerList.filter(ticker => savedFavorites[ticker]);
    await fillNavBar(favoriteList)
  } else {
    await fillNavBar(tickerList);
  }
});

// Initial fill
fillNavBar(tickerList);