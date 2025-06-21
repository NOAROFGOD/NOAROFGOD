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

const ADMIN_CHANNEL_ID = '1385924696301633596'; // 🔁 ใส่แชนแนลหลังบ้านตรงนี้
const pendingOrders = new Map();

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// เปิดเมนู !shop
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛒 BlackPulse Shop')
      .setDescription('เลือกประเภทไฟล์ที่ต้องการ แล้วดำเนินการชำระเงินได้เลย!')
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385928813560594524/IMG_7843.gif') // รูปร้าน
      .setColor(0x00ccff);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_type')
      .setPlaceholder('📦 เลือกประเภทไฟล์')
      .addOptions([
        { label: 'BoostFPS', value: 'boostfps', description: 'เพิ่ม FPS ลื่น ๆ' },
        { label: 'Network Tweaker', value: 'network', description: 'เร่งเน็ต ลด packet loss' }
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

// เมื่อเลือกประเภทสินค้า
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_type') return;

  const fileType = interaction.values[0];
  pendingOrders.set(interaction.user.id, { type: fileType });

  const embed = new EmbedBuilder()
    .setTitle('💰 โปรดชำระเงิน 129 บาท')
    .setDescription(`📦 ประเภทไฟล์: ${fileType}\n\n📲 สแกน QR ด้านล่าง แล้วกดปุ่มเพื่อส่งหลักฐานการชำระเงิน`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385929780452655174/IMG_7844.jpg') // QR จริงของร้าน
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
    ephemeral: true,
  });
});

// ส่งหลักฐานรูปภาพ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'confirm_payment') return;

  const config = pendingOrders.get(interaction.user.id);
  if (!config) {
    await interaction.reply({ content: '❌ ไม่พบคำสั่งซื้อของคุณ', ephemeral: true });
    return;
  }

  await interaction.reply({
    content: '📸 กรุณาแนบ **รูปภาพหลักฐานการโอนเงิน** ภายใน 3 นาที (ใช้ปุ่มคลิปหนีบของ Discord เพื่อแนบภาพได้เลย)',
    ephemeral: true,
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

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({
      content: `📥 คำสั่งซื้อจาก <@${interaction.user.id}>\n📦 ประเภท: ${config.type}\n📎 แนบหลักฐานการโอน`,
      files: [proofImage],
    });

    await message.reply('✅ ส่งหลักฐานเรียบร้อยแล้ว รอแอดมินตรวจสอบนะคะ 💬');
  } catch (err) {
    console.log('❌ ไม่ได้รับภาพในเวลา:', err);
    await interaction.followUp({ content: '⏰ หมดเวลาส่งหลักฐานแล้วค่ะ ลองใหม่โดยพิมพ์ `!shop` อีกครั้ง', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
