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

    const sellPrice = priceMap[r.item]?.buy;
    if (!sellPrice || sellPrice <= 0) continue;

    let cost = 0;
    let valid = true;

    for (let mat of r.materials) {
      const matPrice = priceMap[mat.item]?.sell;

      if (!matPrice || matPrice <= 0) {
        valid = false;
        break;
      }

      cost += matPrice * mat.amount;
    }

    if (!valid) continue;
    if (cost < 100) continue; // กันของกาก

    const profit = Math.floor(
      sellPrice * (1 - config.TAX) - cost
    );

    if (profit < 300) continue;

    const percent = ((profit / cost) * 100).toFixed(1);

    results.push({
      item: r.item,
      cost,
      sell: sellPrice,
      profit,
      percent: percent + "%"
    });
  }

  console.log("Total craft results:", results.length);

  return results
    .sort((a,b)=>b.profit-a.profit)
    .slice(0, config.TOP_N);
}

module.exports = { calculateCraftProfit };
