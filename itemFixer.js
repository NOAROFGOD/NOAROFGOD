function fixItemName(name) {
  if (!name) return name;

  return name
    .replace("PLANKS", "PLANK")
    .replace("METALBARS", "BAR")
    .replace("CLOTHS", "CLOTH")
    .replace("LEATHERS", "LEATHER")
    .replace("STONEBLOCKS", "BLOCK")
    .replace("MEATS", "MEAT")
    .replace("FISHES", "FISH");
}

module.exports = { fixItemName };
