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

      // 🔥 รองรับโครง Albion จริง
      const crafting =
        obj.craftingrequirements ||
        obj["@craftingrequirements"];

      if (crafting) {

        const item =
          obj.uniquename ||
          obj["@uniquename"] ||
          obj["@id"];

        const resources =
          crafting.craftresource ||
          crafting["@craftresource"] ||
          [];

        const materials = [];

        for (let r of resources) {
          const matName =
            r.uniquename ||
            r["@uniquename"];

          const count =
            parseInt(r.count || r["@count"] || 1);

          if (matName) {
            materials.push({
              item: matName,
              amount: count
            });
          }
        }

        if (item && materials.length > 0) {
          recipes.push({
            item,
            materials
          });
        }
      }

      for (let key in obj) {
        walk(obj[key]);
      }
    }
  }

  walk(raw);

  console.log("📦 Loaded recipes:", recipes.length);

  if (recipes[0]) {
    console.log("🧪 Sample recipe:", recipes[0]);
  }

  return recipes;
}

module.exports = { loadRecipes };
