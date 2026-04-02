const axios = require("axios");
const config = require("./config");

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

async function fetchPrices(items) {
  const chunks = chunk(items, config.CHUNK_SIZE);
  let all = [];

  for (let i = 0; i < chunks.length; i++) {
    const url = `https://east.albion-online-data.com/api/v2/stats/prices/${chunks[i].join(",")}?locations=${config.CITIES.join(",")}`;

    try {
      const res = await axios.get(url);
      all = all.concat(res.data);

      console.log(`✅ Chunk ${i+1}/${chunks.length}`);
      await sleep(config.REQUEST_DELAY);

    } catch (err) {
      if (err.response?.status === 429) {
        console.log("⛔ 429 retry...");
        await sleep(config.RETRY_DELAY);
        i--;
      }
    }
  }

  return all;
}

module.exports = { fetchPrices };
