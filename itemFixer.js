function fixItemName(name) {
  if (!name) return name;

  return name
    .replace(/PLANKS/g, "PLANK")
    .replace(/METALBARS/g, "BAR")
    .replace(/CLOTHS/g, "CLOTH")
    .replace(/LEATHERS/g, "LEATHER")
    .replace(/STONEBLOCKS/g, "BLOCK")
    .replace(/MEATS/g, "MEAT")
    .replace(/FISHES/g, "FISH")
    .replace(/_LEVEL\d+/g, "")
    .trim();
}

module.exports = { fixItemName };
