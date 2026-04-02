const axios = require("axios");
const { setCache, getCache } = require("./cache");
const config = require("./config");

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// ✅ sleep function
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function fetchPrices(items) {
  const cacheKey = "market_prices";
  const cached = getCache(cacheKey);
  if (cached) {
    console.log("⚡ Using cache");
    return cached;
  }

  const chunks = chunk(items, config.CHUNK_SIZE);
  let all = [];

  for (let i = 0; i < chunks.length; i++) {
    const part = chunks[i];

    const url = `https://west.albion-online-data.com/api/v2/stats/prices/${part.join(",")}?locations=${config.CITIES.join(",")}`;

    try {
      const res = await axios.get(url);
      all = all.concat(res.data);

      console.log(`✅ Chunk ${i + 1}/${chunks.length}`);

      // 🔥 delay ปกติ
      await sleep(config.REQUEST_DELAY);

    } catch (err) {

      // 🔥 ถ้าโดน 429 → retry
      if (err.response && err.response.status === 429) {
        console.log(`⛔ 429 Rate Limit → retry chunk ${i + 1}`);

        await sleep(config.RETRY_DELAY);
        i--; // ยิงซ้ำ chunk เดิม
        continue;
      }

      console.log("❌ API error:", err.message);
      await sleep(1000);
    }
  }

  setCache(cacheKey, all, config.CACHE_TTL);
  return all;
}

module.exports = { fetchPrices };
