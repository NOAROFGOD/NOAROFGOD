const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

// 🔥 เลือกเฉพาะของทำเงินจริง
function isGoodItem(item) {
  if (!item || typeof item !== "string") return false;

  return (
    item.includes("SOUP") ||
    item.includes("STEAK") ||
    item.includes("OMELETTE") ||
    item.includes("SALAD") ||

    item.includes("POTION") ||

    item.includes("PLANK") ||
    item.includes("BAR") ||
    item.includes("CLOTH") ||
    item.includes("LEATHER")
  );
}

async function loadRecipes() {
  const filePath = path.resolve(__dirname, "items.xml");
  const xml = fs.readFileSync(filePath, "utf-8");

  const parser = new xml2js.Parser({ explicitArray: false });
  const data = await parser.parseStringPromise(xml);

  const recipes = [];

  function walk(obj) {
    if (!obj || typeof obj !== "object") return;

    // 🔥 เจอ crafting
    if (obj.craftingrequirements) {

      const item = obj.$?.uniquename;

      if (!item) return;
      if (!item.startsWith("T")) return;
      if (!isGoodItem(item)) return;

      let resources = obj.craftingrequirements.craftresource;

      // 🔥 FIX: รองรับ object / array
      if (resources && !Array.isArray(resources)) {
        resources = [resources];
      }

      const materials = [];

      if (resources) {
        for (let r of resources) {

          const matName = r.$?.uniquename;
          const count = parseInt(r.$?.count || 1);

          if (matName) {
            materials.push({
              item: matName,
              amount: count
            });
          }
        }
      }

      if (materials.length > 0) {
        recipes.push({
          item,
          materials
        });
      }
    }

    // 🔁 loop ลึก
    for (let key in obj) {
      walk(obj[key]);
    }
  }

  walk(data);

  console.log("📦 Loaded recipes:", recipes.length);

  if (recipes[0]) {
    console.log("🧪 Sample recipe:", recipes[0]);
  }

  return recipes;
}

module.exports = { loadRecipes };
