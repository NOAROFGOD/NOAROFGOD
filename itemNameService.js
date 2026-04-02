const axios = require("axios");
const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "itemNamesCache.json");

// โหลด cache
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  }
  return {};
}

// บันทึก cache
function saveCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

// ดึงชื่อจาก API
async function buildItemNameMap(items) {
  let cache = loadCache();

  const missing = items
    .map(i => i.split("@")[0]) // ตัด enchant
    .filter(i => !cache[i]);

  const uniqueMissing = [...new Set(missing)];

  console.log(`🔍 Missing names: ${uniqueMissing.length}`);

  for (let id of uniqueMissing) {
    try {
      const url = `https://gameinfo.albiononline.com/api/gameinfo/items/${id}`;
      const res = await axios.get(url);

      const name = res.data.LocalizedNames["EN-US"];
      cache[id] = name;

      console.log("✔", id, "→", name);

    } catch (e) {
      cache[id] = id; // fallback
      console.log("❌ Not found:", id);
    }

    await new Promise(r => setTimeout(r, 200)); // กันโดน block
  }

  saveCache(cache);
  return cache;
}

module.exports = { buildItemNameMap, loadCache };
