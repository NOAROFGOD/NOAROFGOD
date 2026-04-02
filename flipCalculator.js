const config = require("./config");
const axios = require("axios");

const nameCache = {};

async function getItemName(itemId) {
  const base = itemId.split("@")[0];

  if (nameCache[base]) return nameCache[base];

  try {
    const res = await axios.get(
      `https://gameinfo.albiononline.com/api/gameinfo/items/${base}`
    );

    const name = res.data.LocalizedNames["EN-US"];
    nameCache[base] = name;
    return name;

  } catch {
    nameCache[base] = base;
    return base;
  }
}

async function formatItem(itemId) {
  let enchant = "";

  if (itemId.includes("@")) {
    enchant = "." + itemId.split("@")[1];
  }

  const name = await getItemName(itemId);
  return name + enchant;
}

async function calculateFlip(data) {
  const map = {};

  for (let e of data) {
    if (!e.item_id) continue;

    if (!map[e.item_id]) map[e.item_id] = [];

    map[e.item_id].push({
      city: e.city,
      buy: e.buy_price_max,
      sell: e.sell_price_min
    });
  }

  const results = [];

  for (let item in map) {
    for (let a of map[item]) {
      for (let b of map[item]) {

        if (a.city === b.city) continue;
        if (a.sell <= 0 || b.buy <= 0) continue;

        const profit = Math.floor(
          b.buy * (1 - config.TAX) - a.sell
        );

        // 🔥 debug
        if (profit > 0) {
          console.log("DEBUG:", item, profit);
        }

        if (profit < config.MIN_PROFIT) continue;

        const percent = ((profit / a.sell) * 100).toFixed(1);

        const realName = await formatItem(item);

        results.push({
          item: realName,
          route: `${a.city} → ${b.city}`,
          buy: a.sell,
          sell: b.buy,
          profit,
          percent: percent + "%"
        });
      }
    }
  }

  console.log("Total results:", results.length);

  return results
    .sort((a,b)=>b.profit-a.profit)
    .slice(0, config.TOP_N);
}

module.exports = { calculateFlip };
