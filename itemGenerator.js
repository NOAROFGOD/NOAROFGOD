const fs = require("fs");
const path = require("path");

function extractIds(obj, result = []) {
  if (Array.isArray(obj)) {
    obj.forEach(i => extractIds(i, result));
  } else if (typeof obj === "object" && obj !== null) {
    if (obj["@id"] && !obj["@hideindropdown"]) {
      result.push(obj["@id"]);
    }
    for (let key in obj) {
      extractIds(obj[key], result);
    }
  }
  return result;
}

function generateBaseIds() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/items.json"), "utf-8")
  );

  const ids = extractIds(raw);

  // ลบซ้ำ
  return [...new Set(ids)];
}

module.exports = { generateBaseIds };
