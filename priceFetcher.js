const axios = require("axios");
const config = require("./config");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function fetchPrices(items) {

  const chunks = chunk(items, config.CHUNK_SIZE);
  let all = [];

  for (let i = 0; i < chunks.length; i++) {

    const url = `https://west.albion-online-data.com/api/v2/stats/prices/${chunks[i].join(",")}?locations=${config.CITIES.join(",")}`;

    try {
      const res = await axios.get(url);

      all = all.concat(res.data);

      console.log(`✅ Chunk ${i+1}/${chunks.length}`);

      await sleep(config.REQUEST_DELAY);

    } catch (err) {

      if (err.response?.status === 429) {
        console.log("⛔ RATE LIMIT → retry...");
        await sleep(config.RETRY_DELAY);
        i--;
      } else {
        console.log("❌ API ERROR");
      }
    }
  }

  return all;
}

module.exports = { fetchPrices };
