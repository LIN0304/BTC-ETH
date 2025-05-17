const statusEl = document.getElementById('status');
const btcCtx = document.getElementById('btcChart').getContext('2d');
const relationCtx = document.getElementById('relationChart').getContext('2d');

let breakEvents = JSON.parse(localStorage.getItem('breakEvents') || '[]');
breakEvents.forEach(ev => {
    if (!('btcPrice' in ev)) {
        ev.btcPrice = null;
    }
});

function fetchKlines(symbol, interval, limit) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    return fetch(url).then(res => res.json());
}

async function loadData() {
    try {
        const [btcKlines, ethKlines] = await Promise.all([
            fetchKlines('BTCUSDT', '1h', 200),
            fetchKlines('ETHUSDT', '1h', 200)
        ]);

        const btcData = btcKlines.map(k => ({
            x: k[0],
            o: +k[1],
            h: +k[2],
            l: +k[3],
            c: +k[4]
        }));

        const ethLineData = ethKlines.map(k => ({
            x: k[0],
            y: +k[4]
        }));

        const ethPriceMap = {};
        ethKlines.forEach(k => {
            ethPriceMap[k[0]] = +k[4];
        });

        let lastCross = breakEvents.length ? breakEvents[breakEvents.length - 1].time : null;
        let count = breakEvents.length;

        for (let i = 1; i < btcData.length; i++) {
            const prev = btcData[i - 1].c;
            const curr = btcData[i].c;
            const time = btcData[i].x;
            if (prev < 100000 && curr >= 100000 && (!lastCross || time > lastCross)) {
                count += 1;
                const ethPrice = ethPriceMap[time] || null;
                breakEvents.push({ n: count, time, ethPrice, btcPrice: curr });
                lastCross = time;
            }
        }

        localStorage.setItem('breakEvents', JSON.stringify(breakEvents));
        statusEl.textContent = `突破次數: ${breakEvents.length}`;

        drawCharts(btcData, ethLineData, breakEvents);
    } catch (err) {
        statusEl.textContent = '取得資料失敗';
    }
}

function drawCharts(btcData, ethLineData, events) {
    if (window.btcChart) {
        window.btcChart.destroy();
    }
    if (window.relationChart) {
        window.relationChart.destroy();
    }

    const annotations = events.map(ev => ({
        type: 'line',
        borderColor: '#EBCB8B',
        borderWidth: 2,
        scaleID: 'x',
        value: ev.time,
        label: {
            enabled: true,
            content: [`#${ev.n}`, `BTC:${ev.btcPrice}`, `ETH:${ev.ethPrice}`],
            backgroundColor: '#5E81AC',
            color: '#ECEFF4',
        }
    }));

    window.btcChart = new Chart(btcCtx, {
        type: 'candlestick',
        data: {
            datasets: [
                {
                    label: 'BTC/USDT',
                    data: btcData,
                    color: {
                        up: '#A3BE8C',
                        down: '#BF616A',
                        unchanged: '#D8DEE9'
                    }
                },
                {
                    type: 'line',
                    label: 'ETH/USDT',
                    data: ethLineData,
                    borderColor: '#88C0D0',
                    pointRadius: 0,
                    borderWidth: 1,
                    yAxisID: 'y1'
                },
                {
                    type: 'scatter',
                    label: 'ETH @ Breakout',
                    data: events.map(e => ({ x: e.time, y: e.ethPrice })),
                    borderColor: '#EBCB8B',
                    backgroundColor: '#EBCB8B',
                    yAxisID: 'y1',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { annotation: { annotations } },
            scales: {
                x: {
                    type: 'time',
                    ticks: { color: '#D8DEE9' },
                    grid: { color: '#4C566A' }
                },
                y: {
                    ticks: { color: '#D8DEE9' },
                    grid: { color: '#4C566A' }
                },
                y1: {
                    position: 'right',
                    ticks: { color: '#D8DEE9' },
                    grid: { color: '#4C566A' }
                }
            }
        }
    });

    const relationData = {
        labels: events.map(e => e.n),
        datasets: [{
            label: 'ETH Price when BTC broke 100k',
            data: events.map(e => e.ethPrice),
            borderColor: '#88C0D0',
            backgroundColor: '#88C0D0',
            fill: false,
            tension: 0.1
        }]
    };

    window.relationChart = new Chart(relationCtx, {
        type: 'line',
        data: relationData,
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: { color: '#D8DEE9' },
                    grid: { color: '#4C566A' }
                },
                y: {
                    ticks: { color: '#D8DEE9' },
                    grid: { color: '#4C566A' }
                }
            }
        }
    });
}

loadData();
setInterval(loadData, 60 * 60 * 1000);
