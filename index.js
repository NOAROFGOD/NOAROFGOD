const { generateBaseIds } = require("./itemGenerator");
const { generateAPIItems } = require("./mapping");
const { fetchPrices } = require("./priceFetcher");
const { calculateFlip } = require("./flipCalculator");
const { buildItemNameMap } = require("./itemNameService"); // 👈 เพิ่ม
const config = require("./config");

async function main() {
  console.log("1. Generate base IDs...");
  const baseIds = generateBaseIds();
  console.log("Total base IDs:", baseIds.length);

  console.log("2. Generate API items...");
  const items = generateAPIItems(baseIds, config);
  console.log("Total API items:", items.length);

  // 🔥 STEP ใหม่: ดึงชื่อไอเทมจริง
  console.log("2.5 Build item name map...");
  const nameMap = await buildItemNameMap(items);

  console.log("3. Fetch market prices...");
  const prices = await fetchPrices(items);
  console.log("Total price entries:", prices.length);

  console.log("4. Calculate flips...");
  const flips = calculateFlip(prices, nameMap); // 👈 ส่ง nameMap เข้าไป

  console.log("\n🔥 TOP FLIPS 🔥");
  console.table(flips);
}

main();
