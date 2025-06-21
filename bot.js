const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  StringSelectMenuBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const ADMIN_CHANNEL_ID = '1385924696301633596'; // เปลี่ยนเป็น channel ID ของแอดมิน
const productCatalog = {
  boostfps: { name: 'BoostFPS', price: 129 },
  network: { name: 'Network Tweaker', price: 149 },
  visual: { name: 'Visual Remover', price: 99 },
  autoloot: { name: 'FiveM AutoLoot', price: 179 },
  stutterfix: { name: 'AntiStutter Pack', price: 139 }
};

const pendingOrders = new Map();

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛒 BlackPulse Shop')
      .setDescription('เลือกสินค้าที่ต้องการ แล้วดำเนินการสั่งซื้อได้เลย!')
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385928813560594524/IMG_7843.gif')
      .setColor(0x00ccff);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_type')
      .setPlaceholder('📦 เลือกสินค้า')
      .addOptions(Object.entries(productCatalog).map(([value, { name, price }]) => ({
        label: name,
        value,
        description: `ราคา ${price} บาท`
      })));

    const row = new ActionRowBuilder().addComponents(select);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_type') return;

  const productId = interaction.values[0];
  const product = productCatalog[productId];
  if (!product) return;

  pendingOrders.set(interaction.user.id, { type: productId });

  const embed = new EmbedBuilder()
    .setTitle(`💰 โปรดชำระเงิน ${product.price} บาท`)
    .setDescription(`🛒 สินค้า: **${product.name}**\n\n📲 สแกน QR ด้านล่าง แล้วกดปุ่มเพื่อแนบหลักฐานการโอน`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385929780452655174/IMG_7844.jpg')
    .setColor(0x00ff00);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_payment')
      .setLabel('📤 ส่งหลักฐานการชำระเงิน')
      .setStyle(ButtonStyle.Success)
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true // ✅ ให้เห็นแค่คนกด
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'confirm_payment') return;

  const config = pendingOrders.get(interaction.user.id);
  if (!config) {
    await interaction.reply({ content: '❌ ไม่พบคำสั่งซื้อของคุณ', ephemeral: true });
    return;
  }

  await interaction.reply({
    content: '📸 กรุณาแนบ **รูปภาพหลักฐานการโอนเงิน** ด้านล่างภายใน 3 นาที (กด 📎 เพื่ออัปโหลด)',
    ephemeral: true
  });

  const filter = (m) =>
    m.author.id === interaction.user.id &&
    m.attachments.size > 0 &&
    m.attachments.first().contentType?.startsWith('image/');

  try {
    const collected = await interaction.channel.awaitMessages({
      filter,
      max: 1,
      time: 180000,
      errors: ['time'],
    });

    const message = collected.first();
    const proofImage = message.attachments.first();
    const product = productCatalog[config.type];

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({
      content: `📥 คำสั่งซื้อจาก <@${interaction.user.id}>\n🛒 สินค้า: ${product.name}\n💸 ราคา: ${product.price} บาท\n📎 แนบหลักฐานการโอน`,
      files: [proofImage]
    });

    await message.reply('✅ ส่งหลักฐานเรียบร้อยแล้ว รอแอดมินตรวจสอบนะคะ 💬');
  } catch (err) {
    console.log('❌ ไม่ได้รับภาพภายในเวลา:', err);
    await interaction.followUp({
      content: '⏰ หมดเวลาส่งหลักฐานแล้วค่ะ ลองใหม่อีกครั้งโดยพิมพ์ `!shop`',
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
