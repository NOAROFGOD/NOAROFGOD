const config = require("./config");
const { fixItemName } = require("./itemFixer");

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

    const fixedItem = fixItemName(r.item);
    const sellPrice = priceMap[fixedItem]?.buy;

    // 🔥 DEBUG
    if (!sellPrice) {
      // console.log("❌ Missing item:", fixedItem);
      continue;
    }

    let cost = 0;
    let valid = true;

    for (let mat of r.materials) {

      const fixedMat = fixItemName(mat.item);
      const matPrice = priceMap[fixedMat]?.sell;

      if (!matPrice) {
        // console.log("❌ Missing mat:", fixedMat);
        valid = false;
        break;
      }

      cost += matPrice * mat.amount;
    }

    if (!valid || cost <= 0) continue;
    if (cost < 100) continue;

    const profit = Math.floor(
      sellPrice * (1 - config.TAX) - cost
    );

    const percent = (profit / cost) * 100;

    if (profit < config.MIN_PROFIT) continue;
    if (percent < config.MIN_PERCENT) continue;

    results.push({
      item: fixedItem,
      cost,
      sell: sellPrice,
      profit,
      percent: percent.toFixed(1) + "%"
    });
  }

  console.log("Total craft results:", results.length);

  return results
    .sort((a,b)=>b.profit-a.profit)
    .slice(0, config.TOP_N);
}

module.exports = { calculateCraftProfit };
