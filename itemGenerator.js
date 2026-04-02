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
  // 👉 หาไฟล์ในโฟลเดอร์เดียวกัน
  const filePath = path.resolve(__dirname, "items.json");

  // 👉 กันพลาด
  if (!fs.existsSync(filePath)) {
    console.error("❌ หา items.json ไม่เจอที่:", filePath);
    process.exit(1);
  }

  const raw = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );

  const ids = extractIds(raw);

  return [...new Set(ids)];
}

module.exports = { generateBaseIds };
