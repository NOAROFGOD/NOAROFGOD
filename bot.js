const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Events,
  StringSelectMenuBuilder,
} = require('discord.js');
const QRCode = require('qrcode');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const ADMIN_CHANNEL_ID = 'YOUR_ADMIN_CHANNEL_ID'; // ใส่ ID แชแนลหลังบ้าน
const pendingOrders = new Map();

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛒 BlackPulse Shop')
      .setDescription('เลือกประเภทไฟล์ที่ต้องการปรับแต่ง ระบบจะสร้างไฟล?ให้คุณ!')
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385928813560594524/IMG_7843.gif?ex=6857da4a&is=685688ca&hm=aab1506ad7227072f050b7ba7b72e52687e4912723e74c8011ad034c7edd1f1c&')
      .setColor(0x00ccff);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_type')
      .setPlaceholder('📦 เลือกประเภทไฟล์...')
      .addOptions([
        { label: 'BoostFPS', value: 'boostfps', description: 'เพิ่ม FPS ลื่น ๆ' },
        { label: 'Network Tweaker', value: 'network', description: 'เร่งเน็ต-ลด packet loss' }
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

// 📦 เมื่อเลือกประเภท
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_type') return;

  try {
    const fileType = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`order_modal_${fileType}`)
      .setTitle(`ตั้งค่า ${fileType.toUpperCase()}`);

    if (fileType === 'boostfps') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('lod')
            .setLabel('LOD Scale')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('draw')
            .setLabel('Draw Distance')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    } else if (fileType === 'network') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ping')
            .setLabel('Ping Delay')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('packet')
            .setLabel('Packet Rate')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    }

    await interaction.showModal(modal);
  } catch (err) {
    console.error('❌ Failed to show modal:', err);
    if (!interaction.replied) {
      await interaction.reply({ content: 'เกิดข้อผิดพลาดในการเปิดฟอร์ม 😢', ephemeral: true });
    }
  }
});

// 📥 เมื่อ submit modal
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (!interaction.customId.startsWith('order_modal_')) return;

  const fileType = interaction.customId.split('order_modal_')[1];
  let config = { type: fileType };

  if (fileType === 'boostfps') {
    config.lod = interaction.fields.getTextInputValue('lod');
    config.draw = interaction.fields.getTextInputValue('draw');
  } else if (fileType === 'network') {
    config.ping = interaction.fields.getTextInputValue('ping');
    config.packet = interaction.fields.getTextInputValue('packet');
  }

  pendingOrders.set(interaction.user.id, config);

  const qrText = `MOCK-PROMPTPAY-${Date.now()}`;
  const qrBuffer = await QRCode.toBuffer(qrText);

  const embed = new EmbedBuilder()
    .setTitle('💰 โปรดชำระเงิน 129 บาท')
    .setDescription(`ประเภทไฟล์: ${fileType}\nกรุณาสแกน QR แล้วกดปุ่มส่งหลักฐาน`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385929780452655174/IMG_7844.jpg?ex=6857db30&is=685689b0&hm=31800af7885404557af9788d99c1b9dadb7535c7ff6979f1f879a23f0a92dd51&')
    .setColor(0x00ff00);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_payment')
      .setLabel('📤 ส่งหลักฐานการชำระเงิน')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({
    embeds: [embed],
    files: [{ attachment: qrBuffer, name: 'qrcode.png' }],
    components: [row],
    ephemeral: true,
  });
});

// ✅ กดปุ่มส่งหลักฐาน
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'confirm_payment') return;

  const config = pendingOrders.get(interaction.user.id);
  if (!config) {
    await interaction.reply({ content: 'ไม่พบคำสั่งซื้อของคุณ ❌', ephemeral: true });
    return;
  }

  const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
  await adminChannel.send(
    `📥 คำสั่งซื้อจาก <@${interaction.user.id}>\nประเภท: ${config.type}\n` +
    Object.entries(config)
      .filter(([key]) => key !== 'type')
      .map(([k, v]) => `${k}: ${v}`).join('\n') +
    `\n💸 รอตรวจสอบการชำระเงิน`
  );

  await interaction.reply({ content: '📨 ส่งหลักฐานแล้ว รอแอดมินตรวจสอบนะคะ', ephemeral: true });
});

client.login(process.env.TOKEN);
