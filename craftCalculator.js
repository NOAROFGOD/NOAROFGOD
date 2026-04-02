for (let r of recipes) {

  const fixedItem = fixItemName(r.item);
  const sellPrice = priceMap[fixedItem]?.buy;

  if (!sellPrice || sellPrice <= 0) {
    console.log("❌ NO SELL PRICE:", fixedItem);
    continue;
  }

  let cost = 0;
  let valid = true;

  for (let mat of r.materials) {

    const fixedMat = fixItemName(mat.item);
    const matPrice = priceMap[fixedMat]?.sell;

    if (!matPrice || matPrice <= 0) {
      console.log("❌ NO MAT PRICE:", fixedMat);
      valid = false;
      break;
    }

    cost += matPrice * mat.amount;
  }

  if (!valid) continue;

  if (cost < 100) continue;

  const profit = Math.floor(
    sellPrice * (1 - config.TAX) - cost
  );

  const percent = (profit / cost) * 100;

  if (profit < config.MIN_PROFIT) continue;
  if (percent < config.MIN_PERCENT) continue;

  results.push({
    item: fixedItem,
    cost,
    sell: sellPrice,
    profit,
    percent: percent.toFixed(1) + "%"
  });
}
