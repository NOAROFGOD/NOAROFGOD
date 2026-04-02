const config = require("./config");

function generateAPIItems(baseIds) {
  const result = [];

  for (let id of baseIds) {
    for (let tier of config.TIERS) {
      for (let ench of config.ENCHANTS) {

        let item = `T${tier}_${id}`;

        if (ench > 0) {
          item += `@${ench}`;
        }

        result.push(item);
      }
    }
  }

  return [...new Set(result)];
}

module.exports = { generateAPIItems };
