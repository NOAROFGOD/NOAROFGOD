const config = require("./config");

// 🔥 แปลงชื่อไอเทมจริง + enchant
function formatItem(itemId, nameMap) {
  let enchant = "";

  if (itemId.includes("@")) {
    enchant = "." + itemId.split("@")[1];
  }

  const base = itemId.split("@")[0];
  const realName = nameMap?.[base] || base;

  return realName + enchant;
}

function calculateFlip(data, nameMap) {
  const itemMap = {};

  // =====================
  // 1. รวมข้อมูลราคา
  // =====================
  for (let e of data) {
    if (!e.item_id) continue;

    if (!itemMap[e.item_id]) itemMap[e.item_id] = [];

    itemMap[e.item_id].push({
      city: e.city,
      buy: e.buy_price_max,
      sell: e.sell_price_min,
      sellDate: e.sell_price_min_date
    });
  }

  const results = [];

  const now = Date.now();
  const MAX_AGE = 1000 * 60 * 60; // 1 ชม.

  // =====================
  // 2. คำนวณ flip
  // =====================
  for (let item in itemMap) {
    const prices = itemMap[item];

    for (let a of prices) {
      for (let b of prices) {

        if (a.city === b.city) continue;

        // ❌ กันข้อมูลพัง
        if (a.sell <= 0 || b.buy <= 0) continue;

        // ❌ กันราคาต่ำเกิน (ขยะ)
        if (a.sell < 1000 || b.buy < 1000) continue;

        // ❌ กันข้อมูลเก่า
        if (a.sellDate) {
          const age = now - new Date(a.sellDate).getTime();
          if (age > MAX_AGE) continue;
        }

        const profit = Math.floor(
          b.buy * (1 - config.TAX) - a.sell
        );

        if (profit <= config.MIN_PROFIT) continue;

        // ❌ กันกำไรหลอกเว่อร์
        const ratio = b.buy / a.sell;
        if (ratio > 5) continue;

        const percent = ((profit / a.sell) * 100).toFixed(1);

        results.push({
          item: formatItem(item, nameMap), // 🔥 ใช้ชื่อจริง
          rawItem: item,
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
  // 3. sort + top
  // =====================
  return results
    .sort((a, b) => b.profit - a.profit)
    .slice(0, config.TOP_N);
}

module.exports = { calculateFlip };
