const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
  console.log(`ออนไลน์: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.content === '!bag') {

    const res = await axios.get(
      'https://east.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Caerleon'
    );

    const data = res.data[0];

    const embed = new EmbedBuilder()
      .setTitle('💰 ราคา T4 BAG')
      .addFields(
        { name: 'Sell Min', value: `${data.sell_price_min}`, inline: true },
        { name: 'Buy Max', value: `${data.buy_price_max}`, inline: true }
      )
      .setColor(0x00ff99);

    msg.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
