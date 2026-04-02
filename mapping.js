// mapping แบบ hybrid (ฉลาดกว่าของพื้นฐาน)

function normalize(id) {
  let x = id.toLowerCase();

  // ตัด prefix ที่ไม่จำเป็น
  x = x.replace("main_", "");
  x = x.replace("_main", "");

  // special cases
  if (x.includes("2h")) return "2H_" + x.split("_").pop().toUpperCase();
  if (x.includes("1h")) return "1H_" + x.split("_").pop().toUpperCase();

  const parts = x.split("_");

  // กรณีทั่วไป
  let base = parts[parts.length - 1];

  return base.toUpperCase();
}

function generateAPIItems(baseIds, config) {
  const result = [];

  for (let id of baseIds) {
    const mapped = normalize(id);

    // filter ของขยะบางส่วน
    if (
      mapped.includes("TEST") ||
      mapped.includes("TOKEN") ||
      mapped.length < 2
    ) continue;

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
