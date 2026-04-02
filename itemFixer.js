function fixItemName(name) {
  if (!name) return name;

  return name
    .replace("PLANKS", "PLANK")
    .replace("METALBARS", "BAR")
    .replace("CLOTHS", "CLOTH")
    .replace("LEATHERS", "LEATHER")
    .replace("STONEBLOCKS", "BLOCK");
}

module.exports = { fixItemName };
