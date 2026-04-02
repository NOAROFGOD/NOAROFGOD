const { fetchPrices } = require("./priceFetcher");
const { loadRecipes } = require("./recipeLoader");
const { calculateCraftProfit } = require("./craftCalculator");

async function main() {

  console.log("1. Load recipes...");
  const recipes = await loadRecipes();

  // 🔥 เอาเฉพาะของที่ใช้จริง
  const itemSet = new Set();

  for (let r of recipes) {
    itemSet.add(r.item);

    for (let m of r.materials) {
      itemSet.add(m.item);
    }
  }

  const items = Array.from(itemSet);

  console.log("Items for API:", items.length);

  console.log("2. Fetch market prices...");
  const prices = await fetchPrices(items);

  console.log("Total price entries:", prices.length);

  console.log("3. Calculate craft profit...");
  const crafts = calculateCraftProfit(prices, recipes);

  console.log("\n🔥 TOP CRAFT 🔥");
  console.table(crafts);
}

main();
