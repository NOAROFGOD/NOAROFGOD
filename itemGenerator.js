const fs = require("fs");
const path = require("path");

// 🔍 ดึง @id ทั้งหมดแบบ recursive
function extractIds(obj, result = []) {
  if (Array.isArray(obj)) {
    obj.forEach(i => extractIds(i, result));
  } 
  else if (typeof obj === "object" && obj !== null) {

    // ✅ filter id ที่ใช้ได้จริง
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

// 🚀 โหลดไฟล์ + สร้าง baseIds
function generateBaseIds() {
  const filePath = path.resolve(__dirname, "items.json");

  // ❌ กันพลาด
  if (!fs.existsSync(filePath)) {
    console.error("❌ หา items.json ไม่เจอที่:", filePath);
    process.exit(1);
  }

  try {
    const raw = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );

    const ids = extractIds(raw);

    // 🔥 ลบซ้ำ
    const unique = [...new Set(ids)];

    console.log(`📦 Loaded base IDs: ${unique.length}`);

    return unique;

  } catch (err) {
    console.error("❌ JSON parse error:", err.message);
    process.exit(1);
  }
}

module.exports = { generateBaseIds };
