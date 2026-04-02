const { generateBaseIds } = require("./itemGenerator");
const { generateAPIItems } = require("./mapping");
const { fetchPrices } = require("./priceFetcher");

const { loadRecipes } = require("./recipeLoader");
const { calculateCraftProfit } = require("./craftCalculator");

const config = require("./config");

async function main() {
  console.log("1. Generate base IDs...");
  const baseIds = generateBaseIds();
  console.log("Total base IDs:", baseIds.length);

  console.log("2. Generate API items...");
  const items = generateAPIItems(baseIds, config);
  console.log("Total API items:", items.length);

  console.log("3. Fetch market prices...");
  const prices = await fetchPrices(items);
  console.log("Total price entries:", prices.length);

  console.log("4. Load recipes...");
  const recipes = await loadRecipes();

  console.log("5. Calculate craft profit...");
  const crafts = calculateCraftProfit(prices, recipes);

  console.log("\n🔥 TOP CRAFT 🔥");
  console.table(crafts);
}

main();
