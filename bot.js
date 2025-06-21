const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  StringSelectMenuBuilder,
  PermissionsBitField,
  InteractionCollector,
} = require('discord.js');

const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const ADMIN_CHANNEL_ID = '1385951413229850634';
const CATEGORY_ID = '1385950753763623062';

const pendingOrders = new Map();
const priceMap = {
  boostfps: 129,
  network: 149,
  memory: 99,
  dll: 179,
  all: 249,
};

// Google Sheets setup
const SPREADSHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw'; // แก้เป็น ID ชีทของเดียร์
const SHEET_NAME = 'Sheet1';

const auth = new GoogleAuth({
  keyFile: './noar-sserver-9c0924c3819f.json', // ต้องอัปโหลดไฟล์นี้ไว้ในโฟลเดอร์เดียวกับบอทจริง ๆ
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// !createmenu เรียกเมนูร้านค้า
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!createmenu') {
    const embed = new EmbedBuilder()
      .setTitle('🛍️ BlackPulse Shop')
      .setDescription('เลือกสินค้าที่ต้องการ แล้วกด "🛒 สั่งซื้อเลย"')
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385980365969293523/xxxx.gif?ex=68580a4d&is=6856b8cd&hm=6b9c1217b9909c8d34e296c2c3d7c1850b02d646224ba766a5b4823db03f43f1&')
      .setColor(0x00ccff);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_product')
      .setPlaceholder('📦 เลือกสินค้า')
      .addOptions(
        Object.keys(priceMap).map((key) => ({
          label: key.toUpperCase(),
          value: key,
          description: `${priceMap[key]} บาท`,
        }))
      );

    const button = new ButtonBuilder()
      .setCustomId('confirm_order')
      .setLabel('🛒 สั่งซื้อเลย')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(select, button);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

// บันทึกสินค้าที่เลือก (select menu) พร้อม try-catch กัน interaction หมดอายุ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_product') return;

  try {
    const product = interaction.values[0];
    pendingOrders.set(interaction.user.id, product);
    await interaction.deferUpdate();
  } catch (error) {
    console.log('Interaction error (select menu):', error.message);
  }
});

// กดปุ่มสั่งซื้อ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'confirm_order') return;

  const user = interaction.user;
  const guild = interaction.guild;
  const product = pendingOrders.get(user.id);

  if (!product) {
    await interaction.reply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ', ephemeral: true });
    return;
  }

  const price = priceMap[product];

  // สร้าง Role สำหรับลูกค้า ให้มองเห็นห้องนี้เฉพาะตัว
  const role = await guild.roles.create({
    name: `🛍️-${user.username}`,
    permissions: [PermissionsBitField.Flags.ViewChannel],
  });

  // สร้าง Channel ใน Category ที่กำหนด พร้อม permission เห็นเฉพาะลูกค้า + บอท
  const channel = await guild.channels.create({
    name: `📁-order-${user.username.toLowerCase()}`,
    type: 0,
    parent: CATEGORY_ID,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
    ],
  });

  await guild.members.cache.get(user.id)?.roles.add(role);

  // แจ้งลูกค้าว่า สร้างห้องให้แล้วนะ (มองเห็นเฉพาะคนกด)
  await interaction.reply({ content: `สั่งซื้อสำเร็จแล้วระบบได้สร้างห้องชำระเงิน : <#${channel.id}>`, ephemeral: true });

  // ส่ง embed พร้อม QR code ในห้องใหม่
  const embed = new EmbedBuilder()
    .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
    .setDescription(`💰 ราคา: **${price} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg?ex=68580998&is=6856b818&hm=bac10995cacb6ed40e581ba4d8c7cb11d7f362416bc7801e1198fe830881abaf&')
    .setColor(0x00ff00);

  await channel.send({ content: `<@${user.id}>`, embeds: [embed] });

  // รอรับรูปสลิปจากลูกค้า (5 นาที)
  const filter = (m) =>
    m.author.id === user.id &&
    m.attachments.size > 0 &&
    m.attachments.first().contentType?.startsWith('image/');

  try {
    const collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
    const message = collected.first();
    const slip = message.attachments.first();

    // ส่งข้อมูลไปช่องแอดมิน พร้อมปุ่มอนุมัติ / ยกเลิก
    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

    const approveButton = new ButtonBuilder()
      .setCustomId(`approve_${user.id}_${channel.id}_${product}`)
      .setLabel('✅ อนุมัติ')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`cancel_${user.id}_${channel.id}_${product}`)
      .setLabel('❌ ยกเลิก')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approveButton, cancelButton);

    await adminChannel.send({
      content: `📥 ออเดอร์จาก <@${user.id}> - ${product.toUpperCase()} - ${price} บาท\nห้อง: <#${channel.id}>`,
      files: [slip],
      components: [row],
    });

    await message.reply('✅ ส่งหลักฐานเรียบร้อยแล้วค่ะ รอแอดมินตรวจสอบ3-5นาทีน้า~');

  } catch (err) {
    await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่โดย');
  }
});

// ระบบรับปุ่มอนุมัติ / ยกเลิกจากแอดมิน
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;

  // ตรวจสอบปุ่มอนุมัติ
  if (customId.startsWith('approve_')) {
    const [_, userId, channelId, product] = customId.split('_');
    const guild = interaction.guild;

    // ดึงข้อมูล
    const member = await guild.members.fetch(userId).catch(() => null);
    const channel = guild.channels.cache.get(channelId);

    if (!member || !channel) {
      await interaction.reply({ content: '❌ ไม่พบสมาชิกหรือห้องนี้แล้ว', ephemeral: true });
      return;
    }

    // ดึงคีย์จาก Google Sheets แบบสุ่ม
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A2:B`, // สมมติคีย์อยู่ A2:A และสถานะ B
      });
      const rows = response.data.values || [];

      // หาแถวที่ยังไม่ถูกใช้ (เช่น B ค่าว่าง)
      const availableRowIndex = rows.findIndex(row => !row[1]);
      if (availableRowIndex === -1) {
        await interaction.reply({ content: '❌ ไม่มีคีย์ว่างในสต็อกแล้ว', ephemeral: true });
        return;
      }

      const key = rows[availableRowIndex][0];

      // อัพเดตสถานะใน Google Sheets ว่าใช้ไปกับใคร
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!B${availableRowIndex + 2}`, // +2 เพราะเริ่มจากแถว 2
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[userId]],
        },
      });

      // แจ้งลูกค้า
      await member.send(`✅ คำสั่งซื้อของคุณถูกอนุมัติแล้ว!\nคีย์ของคุณ: \`${key}\``);

      // ลบ Role และลบ Channel
      const role = guild.roles.cache.find(r => r.name === `🛍️-${member.user.username}`);
      if (role) {
        await member.roles.remove(role).catch(() => {});
        await role.delete().catch(() => {});
      }
      await channel.delete().catch(() => {});

      await interaction.reply({ content: '✅ อนุมัติและส่งคีย์เรียบร้อยแล้ว', ephemeral: true });

    } catch (error) {
      console.error('Google Sheets API error:', error);
      await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการดึงคีย์', ephemeral: true });
    }

  } else if (customId.startsWith('cancel_')) {
    const [_, userId, channelId, product] = customId.split('_');
    const guild = interaction.guild;
    const member = await guild.members.fetch(userId).catch(() => null);
    const channel = guild.channels.cache.get(channelId);

    if (!member || !channel) {
      await interaction.reply({ content: '❌ ไม่พบสมาชิกหรือห้องนี้แล้ว', ephemeral: true });
      return;
    }

    // แจ้งเหตุผลการยกเลิกให้ลูกค้า
    await interaction.reply({ content: 'กรุณาพิมพ์เหตุผลการยกเลิกภายใน 2 นาที', ephemeral: true });

    // รอข้อความเหตุผลจากแอดมิน
    const filter = m => m.author.id === interaction.user.id;
    try {
      const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 120000, errors: ['time'] });
      const reason = collected.first().content;

      if (member) {
        await member.send(`❌ คำสั่งซื้อของคุณถูกยกเลิก\nสาเหตุ: ${reason}`);
      }

      // ลบ role และ channel
      const role = guild.roles.cache.find(r => r.name === `🛍️-${member.user.username}`);
      if (role) {
        await member.roles.remove(role).catch(() => {});
        await role.delete().catch(() => {});
      }
      await channel.delete().catch(() => {});

      await interaction.followUp({ content: '✅ ยกเลิกคำสั่งซื้อและลบข้อมูลเรียบร้อย', ephemeral: true });

    } catch (error) {
      await interaction.followUp({ content: '❌ หมดเวลาพิมพ์เหตุผล ยกเลิกคำสั่งซื้อไม่สำเร็จ', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
