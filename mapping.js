function normalize(id) {
  let parts = id.split("_");
  return parts[parts.length - 1].toUpperCase();
}

function generateAPIItems(baseIds, config) {
  const result = [];

  for (let id of baseIds) {
    const mapped = normalize(id);

    for (let tier of config.TIERS) {
      for (let ench of config.ENCHANTS) {
        let name = `T${tier}_${mapped}`;
        if (ench > 0) name += `@${ench}`;
        result.push(name);
      }
    }
  }

  return [...new Set(result)];
}

module.exports = { generateAPIItems };
