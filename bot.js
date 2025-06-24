// 📦 ระบบร้านค้าใหม่ล่าสุด รองรับ Discord.js v14+ แบบเสถียร
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
  Partials,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const priceMap = { BetterFiveM: 49 };

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!createmenu') {
    const embed = {
      title: '🛍️ BlackPulse Shop',
      description: 'เลือกสินค้าที่ต้องการ แล้วกดสั่งซื้อ',
      color: 0x00ccff,
      image: {
        url: 'https://cdn.discordapp.com/attachments/1384470774668197998/1385980365969293523/xxxx.gif',
      },
    };

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_product')
      .setPlaceholder('📦 เลือกสินค้า')
      .addOptions(Object.entries(priceMap).map(([key, price]) => ({
        label: key.toUpperCase(),
        value: key,
        description: `${price} บาท`
      })));

    const button = new ButtonBuilder()
      .setCustomId('confirm_order')
      .setLabel('🛒 สั่งซื้อเลย')
      .setStyle(ButtonStyle.Primary);

    await msg.channel.send({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(button),
      ],
    });
  }
});

client.login(process.env.TOKEN);
