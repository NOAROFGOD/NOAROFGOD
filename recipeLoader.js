const fs = require("fs");
const path = require("path");

function loadRecipes() {
  const filePath = path.resolve(__dirname, "items.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const recipes = [];

  function walk(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }

    if (typeof obj === "object" && obj !== null) {

      // 🔥 รองรับได้หลาย key (กัน dataset ต่างเวอร์ชัน)
      const req =
        obj["@craftingrequirements"] ||
        obj["craftingrequirements"] ||
        obj["CraftingRequirements"];

      if (req && Array.isArray(req)) {
        const item =
          obj["@uniquename"] ||
          obj["@id"] ||
          obj["UniqueName"] ||
          obj["Id"];

        const materials = [];

        for (let m of req) {
          materials.push({
            item: m["@item"] || m["Item"] || m["item"],
            amount: parseInt(
              m["@count"] || m["Count"] || m["count"] || 1
            )
          });
        }

        if (item && materials.length > 0) {
          recipes.push({ item, materials });
        }
      }

      for (let key in obj) {
        walk(obj[key]);
      }
    }
  }

  walk(raw);

  console.log("📦 Loaded recipes:", recipes.length);

  // debug ตัวแรก
  if (recipes[0]) {
    console.log("🧪 Sample recipe:", recipes[0]);
  }

  return recipes;
}

module.exports = { loadRecipes };
