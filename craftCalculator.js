const config = require("./config");

function calculateCraftProfit(prices, recipes) {

  const priceMap = {};

  for (let e of prices) {
    if (!priceMap[e.item_id]) {
      priceMap[e.item_id] = {
        buy: e.buy_price_max,
        sell: e.sell_price_min
      };
    }
  }

  const results = [];

  for (let r of recipes) {

    const sell = priceMap[r.item]?.buy;
    if (!sell) continue;

    let cost = 0;
    let valid = true;

    for (let mat of r.materials) {
      const p = priceMap[mat.item]?.sell;

      if (!p) {
        valid = false;
        break;
      }

      cost += p * mat.amount;
    }

    if (!valid) continue;

    const profit = Math.floor(
      sell * (1 - config.TAX) - cost
    );

    if (profit <= 0) continue;

    const percent = ((profit / cost) * 100).toFixed(1);

    results.push({
      item: r.item,
      cost,
      sell,
      profit,
      percent: percent + "%"
    });
  }

  return results
    .sort((a,b)=>b.profit-a.profit)
    .slice(0, 20);
}

module.exports = { calculateCraftProfit };
