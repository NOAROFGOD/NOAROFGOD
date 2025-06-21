const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, EmbedBuilder } = require('discord.js');
const QRCode = require('qrcode');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// เก็บคำสั่งซื้อชั่วคราว userId => config
const pendingOrders = new Map();

// ใส่ช่องแชแนลแอดมินตรงนี้ (แก้เป็นจริง)
const ADMIN_CHANNEL_ID = '1385924696301633596';

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// คำสั่งพื้นฐาน !ping
client.on('messageCreate', async msg => {
  if (msg.content === '!ping') {
    msg.reply('pong pong 🏓');
  }

  if (msg.content === '!shop') {
    // สร้าง Embed เมนูหลัก
    const embed = new EmbedBuilder()
      .setTitle('BlackPulse CustomDLL Shop')
      .setDescription('สามารถปรับแต่งไฟล์ได้เยอะโดยที่ไม่ต้องติดต่อแอดมิน ระบบจะทำให้ สะดวกสบายใช้งานง่าย24ชม.')
      .setColor(0x00ff00)
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385928813560594524/IMG_7843.gif?ex=6857da4a&is=685688ca&hm=aab1506ad7227072f050b7ba7b72e52687e4912723e74c8011ad034c7edd1f1c&'); // เปลี่ยนเป็น URL รูปจริง

    // สร้างปุ่มสองปุ่ม
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pay_button')
        .setLabel('💸 ชำระเงิน')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('order_button')
        .setLabel('🛠 สั่งซื้อไฟล์')
        .setStyle(ButtonStyle.Success),
    );

    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

// เมื่อกดปุ่ม
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;

  if (interaction.customId === 'pay_button') {
    await interaction.reply({ content: 'ระบบชำระเงินยังไม่เปิดใช้งาน', ephemeral: true });
  }

  if (interaction.customId === 'order_button') {
    // เปิด Modal กรอก config
    const modal = new ModalBuilder()
      .setCustomId('order_modal')
      .setTitle('ตั้งค่า BoostFPS DLL');

    // ใส่ช่องกรอกข้อมูลใน modal
    const lodInput = new TextInputBuilder()
      .setCustomId('lod_scale')
      .setLabel('LOD Scale (0.1-1.5)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('0.25')
      .setRequired(true);

    const drawInput = new TextInputBuilder()
      .setCustomId('draw_distance')
      .setLabel('Draw Distance (100-2000)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('500')
      .setRequired(true);

    const threadInput = new TextInputBuilder()
      .setCustomId('thread_priority')
      .setLabel('Thread Priority (idle,low,normal,high,realtime)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('high')
      .setRequired(true);

    const bufferInput = new TextInputBuilder()
      .setCustomId('smart_buffer')
      .setLabel('Smart Buffer (on/off)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('on')
      .setRequired(true);

    // Discord Modal limit 5 inputs per ActionRow, เราแบ่งเป็น 2 แถว
    const firstRow = new ActionRowBuilder().addComponents(lodInput);
    const secondRow = new ActionRowBuilder().addComponents(drawInput);
    const thirdRow = new ActionRowBuilder().addComponents(threadInput);
    const fourthRow = new ActionRowBuilder().addComponents(bufferInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

    await interaction.showModal(modal);
  }
});

// เมื่อ Modal Submit
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'order_modal') return;

  const userId = interaction.user.id;

  // ดึงค่าจาก modal
  const lod_scale = interaction.fields.getTextInputValue('lod_scale');
  const draw_distance = interaction.fields.getTextInputValue('draw_distance');
  const thread_priority = interaction.fields.getTextInputValue('thread_priority');
  const smart_buffer = interaction.fields.getTextInputValue('smart_buffer');

  // เก็บ config ชั่วคราว
  pendingOrders.set(userId, {
    lod_scale,
    draw_distance,
    thread_priority,
    smart_buffer
  });

  // สร้าง QR Code mock (เปลี่ยนเลขบัญชีเป็นจริง)
  const qrText = '000000000000000000000000000000';
  const qrBuffer = await QRCode.toBuffer(qrText);

  const file = {
    attachment: qrBuffer,
    name: 'promptpay.png'
  };

  const embed = new EmbedBuilder()
    .setTitle('โปรดชำระเงิน 129 บาท')
    .setDescription('สแกน QR Code นี้เพื่อชำระเงิน แล้วกดปุ่มส่งหลักฐาน')
    .setColor(0x00ff00)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385929780452655174/IMG_7844.jpg?ex=6857db30&is=685689b0&hm=31800af7885404557af9788d99c1b9dadb7535c7ff6979f1f879a23f0a92dd51&');

  // ปุ่มส่งหลักฐาน
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_payment')
      .setLabel('📤 ส่งหลักฐานการชำระเงิน')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({ embeds: [embed], files: [file], components: [row], ephemeral: true });
});

// กดปุ่มยืนยันชำระเงิน
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'confirm_payment') return;

  const userId = interaction.user.id;

  if (!pendingOrders.has(userId)) {
    await interaction.reply({ content: 'คุณยังไม่มีคำสั่งซื้อที่รอชำระเงิน', ephemeral: true });
    return;
  }

  const config = pendingOrders.get(userId);

  // ส่ง log เข้าแชแนลแอดมิน
  const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
  await adminChannel.send(
    `🛎️ คำสั่งซื้อใหม่จาก <@${userId}>\n` +
    `Config: ${JSON.stringify(config, null, 2)}\n` +
    `ยอดเงิน: 129 บาท\n` +
    `โปรดตรวจสอบและอนุมัติ`
  );

  await interaction.reply({ content: 'ส่งหลักฐานเรียบร้อย รอตรวจสอบจากแอดมินนะครับ', ephemeral: true });
});

client.login(process.env.TOKEN);
