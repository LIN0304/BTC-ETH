const statusEl = document.getElementById('status');

// Get count from localStorage
let breakCount = parseInt(localStorage.getItem('btcBreakCount') || '0', 10);
let lastPrice = parseFloat(localStorage.getItem('lastBtcPrice') || '0');

async function fetchPrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usdt');
        const data = await response.json();
        const btcPrice = data.bitcoin.usdt;
        const ethPrice = data.ethereum.usdt;

        if (lastPrice < 100000 && btcPrice >= 100000) {
            breakCount += 1;
            localStorage.setItem('btcBreakCount', breakCount);
            alert(`比特幣第 ${breakCount} 次突破 100k! 以太幣價格: ${ethPrice} USDT`);
        }

        lastPrice = btcPrice;
        localStorage.setItem('lastBtcPrice', lastPrice);

        statusEl.textContent = `BTC: ${btcPrice} USDT\nETH: ${ethPrice} USDT\n突破次數: ${breakCount}`;
    } catch (err) {
        statusEl.textContent = '取得價格失敗';
    }
}

fetchPrices();
setInterval(fetchPrices, 60000); // 每分鐘更新一次
