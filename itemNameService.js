const axios = require("axios");

const cache = {};

// ดึงชื่อจริงจาก Albion API
async function getItemName(itemId) {
  const base = itemId.split("@")[0];

  if (cache[base]) return cache[base];

  try {
    const url = `https://gameinfo.albiononline.com/api/gameinfo/items/${base}`;
    const res = await axios.get(url);

    const name = res.data.LocalizedNames["EN-US"];
    cache[base] = name;

    return name;
  } catch (e) {
    cache[base] = base;
    return base;
  }
}

// format + enchant
async function formatItem(itemId) {
  let enchant = "";

  if (itemId.includes("@")) {
    enchant = "." + itemId.split("@")[1];
  }

  const name = await getItemName(itemId);

  return name + enchant;
}

module.exports = { formatItem };
