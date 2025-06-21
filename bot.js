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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const ADMIN_CHANNEL_ID = '1385924696301633596';
const pendingOrders = new Map();

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛒 BlackPulse Shop')
      .setDescription('เลือกประเภทไฟล์ที่ต้องการ แล้วเริ่มตั้งค่าได้เลย!')
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385928813560594524/IMG_7843.gif') // รูปเมนู
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

// เมื่อเลือกประเภท
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
            .setLabel('LOD Scale (เช่น 1.0)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('draw')
            .setLabel('Draw Distance (เช่น 300)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    } else if (fileType === 'network') {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ping')
            .setLabel('Ping Delay (ms)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('packet')
            .setLabel('Packet Rate (packets/sec)')
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

// เมื่อส่ง modal
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

  const embed = new EmbedBuilder()
    .setTitle('💰 โปรดชำระเงิน 129 บาท')
    .setDescription(`ประเภทไฟล์: ${fileType}\nสแกน QR ด้านล่าง แล้วกดปุ่มส่งหลักฐานพร้อมแนบรูปภาพ`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385929780452655174/IMG_7844.jpg')
    .setColor(0x00ff00);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_payment')
      .setLabel('📤 ส่งหลักฐานการชำระเงิน')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
});

// ส่งหลักฐานพร้อมแนบรูป
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'confirm_payment') return;

  const config = pendingOrders.get(interaction.user.id);
  if (!config) {
    await interaction.reply({ content: 'ไม่พบคำสั่งซื้อของคุณ ❌', ephemeral: true });
    return;
  }

  await interaction.reply({
    content: '📷 กรุณาส่ง **รูปภาพหลักฐานการชำระเงิน** ด้านล่างภายใน 3 นาที',
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
      content: `📥 คำสั่งซื้อจาก <@${interaction.user.id}>\nประเภท: ${config.type}\n` +
        Object.entries(config).filter(([k]) => k !== 'type').map(([k, v]) => `${k}: ${v}`).join('\n') +
        `\n💸 แนบหลักฐานการโอน`,
      files: [proofImage],
    });

    await message.reply('✅ ส่งหลักฐานเรียบร้อยแล้วค่ะ รอแอดมินตรวจสอบนะ');
  } catch (err) {
    console.log('❌ ไม่ได้รับภาพภายในเวลา:', err);
    await interaction.followUp({ content: '⏰ หมดเวลาส่งหลักฐานแล้วค่ะ ลองใหม่อีกครั้งโดยพิมพ์ `!shop`', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
