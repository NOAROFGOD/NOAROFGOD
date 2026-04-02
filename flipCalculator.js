const config = require("./config");
const axios = require("axios");

// 🔥 cache ชื่อ
const nameCache = {};

// =====================
// แปลชื่อจริง
// =====================
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

// =====================
// format ชื่อ + enchant
// =====================
async function formatItem(itemId) {
  let enchant = "";

  if (itemId.includes("@")) {
    enchant = "." + itemId.split("@")[1];
  }

  const name = await getItemName(itemId);

  return name + enchant;
}

// =====================
// main
// =====================
async function calculateFlip(data) {

  const map = {};

  // รวมราคา
  for (let e of data) {
    if (!e.item_id) continue;

    if (!map[e.item_id]) map[e.item_id] = [];

    map[e.item_id].push({
      city: e.city,
      buy: e.buy_price_max,
      sell: e.sell_price_min
    });
  }

  const rawResults = [];

  // =====================
  // คำนวณกำไร
  // =====================
  for (let item in map) {
    for (let a of map[item]) {
      for (let b of map[item]) {

        if (a.city === b.city) continue;
        if (a.sell <= 0 || b.buy <= 0) continue;

        const profit = Math.floor(
          b.buy * (1 - config.TAX) - a.sell
        );

        if (profit < config.MIN_PROFIT) continue;

        const percent = ((profit / a.sell) * 100).toFixed(1);

        rawResults.push({
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

  // =====================
  // sort ก่อน
  // =====================
  const top = rawResults
    .sort((a,b)=>b.profit-a.profit)
    .slice(0, config.TOP_N);

  // =====================
  // 🔥 แปลชื่อเฉพาะ Top
  // =====================
  const final = [];

  for (let r of top) {
    const name = await formatItem(r.item);

    final.push({
      item: name,      // 👈 ชื่อจริง
      route: r.route,
      buy: r.buy,
      sell: r.sell,
      profit: r.profit,
      percent: r.percent
    });
  }

  return final;
}

module.exports = { calculateFlip };
