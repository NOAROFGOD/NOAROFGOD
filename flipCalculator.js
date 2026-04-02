const config = require("./config");

function calculateFlip(data) {
  const itemMap = {};

  for (let e of data) {
    if (!itemMap[e.item_id]) itemMap[e.item_id] = [];

    itemMap[e.item_id].push({
      city: e.city,
      buy: e.buy_price_max,
      sell: e.sell_price_min
    });
  }

  const results = [];

  for (let item in itemMap) {
    const prices = itemMap[item];

    for (let a of prices) {
      for (let b of prices) {
        if (a.city === b.city) continue;
        if (a.sell <= 0 || b.buy <= 0) continue;

        const profit = Math.floor(
          b.buy * (1 - config.TAX) - a.sell
        );

        if (profit > config.MIN_PROFIT) {
          const percent = ((profit / a.sell) * 100).toFixed(1);

          results.push({
            item,
            route: `${a.city} → ${b.city}`,
            buy: a.sell,
            sell: b.buy,
            profit,
            percent: percent + "%"
          });
        }
      }
    }
  }

  return results
    .sort((a, b) => b.profit - a.profit)
    .slice(0, config.TOP_N);
}

module.exports = { calculateFlip };
