const fs = require("fs");
const path = require("path");

function extractIds(obj, result = []) {
  if (Array.isArray(obj)) {
    obj.forEach(i => extractIds(i, result));
  } else if (typeof obj === "object" && obj !== null) {

    if (
      obj["@id"] &&
      !obj["@hideindropdown"] &&
      !obj["@id"].includes("other") &&
      obj["@id"].length > 2
    ) {
      result.push(obj["@id"]);
    }

    for (let key in obj) {
      extractIds(obj[key], result);
    }
  }
  return result;
}

function generateBaseIds() {
  const filePath = path.resolve(__dirname, "items.json");

  if (!fs.existsSync(filePath)) {
    console.error("❌ items.json not found:", filePath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const ids = [...new Set(extractIds(raw))];

  console.log(`📦 Loaded base IDs: ${ids.length}`);
  return ids;
}

module.exports = { generateBaseIds };
