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
const pendingOrders = new Map();

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

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.deferUpdate();
    }

    if (interaction.isButton() && interaction.customId === 'confirm_order') {
      const user = interaction.user;
      const product = pendingOrders.get(user.id);

      if (!product) {
        return await interaction.reply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ', ephemeral: true });
      }

      const payButton = new ButtonBuilder()
        .setCustomId(`user_paid_${user.id}_${product}`)
        .setLabel('📤 แจ้งชำระเงิน')
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        content: `🧾 สั่งซื้อ: ${product.toUpperCase()}
💰 ราคา: ${priceMap[product]} บาท
📌 โปรดสแกน QR นี้เพื่อชำระเงิน:
https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg`,
        components: [new ActionRowBuilder().addComponents(payButton)],
        ephemeral: true,
      });
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
});

client.login(process.env.TOKEN);
