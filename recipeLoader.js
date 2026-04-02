const fs = require("fs");
const path = require("path");

function loadRecipes() {
  const filePath = path.resolve(__dirname, "data/items.json");

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const recipes = [];

  function walk(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else if (typeof obj === "object" && obj !== null) {

      // 🔥 ตัวนี้คือ key สำคัญ
      if (obj["@craftingrequirements"]) {

        const item = obj["@uniquename"] || obj["@id"];
        const mats = [];

        for (let mat of obj["@craftingrequirements"]) {
          mats.push({
            item: mat["@item"],
            amount: parseInt(mat["@count"])
          });
        }

        recipes.push({
          item,
          materials: mats
        });
      }

      for (let key in obj) {
        walk(obj[key]);
      }
    }
  }

  walk(raw);

  console.log("📦 Loaded recipes:", recipes.length);

  return recipes;
}

module.exports = { loadRecipes };
