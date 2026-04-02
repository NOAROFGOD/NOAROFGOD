const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require('discord.js');

const axios = require('axios');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('clientReady', () => {
  console.log(`ออนไลน์: ${client.user.tag}`);
});

// =======================
// 📦 โหลด DB
const DB = JSON.parse(fs.readFileSync('./items.json', 'utf8'));


// =======================
// 🔍 หา recipe
function getRecipe(id) {
  return DB.find(x => x.id === id);
}


// =======================
// 🔥 ดึงราคาทีเดียว
async function fetchPrices(items) {

  const url = `https://east.albion-online-data.com/api/v2/stats/prices/${items.join(',')}.json`;

  const res = await axios.get(url);

  let map = {};

  for (let d of res.data) {
    map[d.item_id] = d.sell_price_min;
  }

  return map;
}


// =======================
// 🛠️ คำนวณคราฟ (recursive จริง)
async function calcCost(itemId, prices, visited = new Set()) {

  if (visited.has(itemId)) return 0;
  visited.add(itemId);

  const recipe = getRecipe(itemId);

  // ถ้าไม่มีสูตร → ซื้อ
  if (!recipe || !recipe.craft) {
    return prices[itemId] || 0;
  }

  let total = 0;

  for (let mat of recipe.craft) {
    let cost = await calcCost(mat.item, prices, visited);
    total += cost * mat.amount;
  }

  return total;
}


// =======================
// 🔥 หา Top กำไร
async function findTopProfit() {

  const items = DB.map(x => x.id).slice(0, 100);

  const prices = await fetchPrices(items);

  let results = [];

  for (let item of items) {

    try {
      let sell = prices[item];
      if (!sell) continue;

      let craft = await calcCost(item, prices);

      let tax = sell * 0.06;
      let profit = sell - craft - tax;

      if (profit <= 0) continue;

      results.push({
        item,
        sell,
        craft,
        profit
      });

    } catch {}
  }

  results.sort((a,b)=>b.profit - a.profit);

  return results.slice(0,5);
}


// =======================
// 💬 COMMAND
client.on('messageCreate', async (msg) => {

  if (msg.content === '!profit') {

    msg.reply('⏳ กำลังคำนวณ...');

    const top = await findTopProfit();

    const embed = new EmbedBuilder()
      .setTitle('🔥 TOP 5 PROFIT')
      .setColor(0x00ff99);

    top.forEach((x,i)=>{
      embed.addFields({
        name:`#${i+1} ${x.item}`,
        value:
`💰 ขาย: ${x.sell}
🛠️ คราฟ: ${Math.round(x.craft)}
📊 กำไร: +${Math.round(x.profit)}`,
        inline:false
      });
    });

    msg.channel.send({ embeds:[embed] });
  }

});

client.login(process.env.TOKEN);
