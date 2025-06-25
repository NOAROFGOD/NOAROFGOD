require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Events } = require('discord.js');
const { google } = require('googleapis');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

// CONFIG
const ADMIN_CHANNEL_ID = '1386017253467619540'; // ช่องแจ้งแอดมิน
const ROLE_ID = '1386018737005658273'; // Role ที่จะเพิ่มให้ลูกค้า
const SHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw'; // Spreadsheet ID

const PRODUCTS = {
  betterfivem: {
    label: '⚡ BetterFiveM - 49 บาท',
    price: 49,
    description: 'BoostFPS + ค่าดำติดเครื่อง',
    emoji: '🚀',
    image: 'https://cdn.discordapp.com/attachments/1384470774668197998/1387217235478581348/IMG_7845.jpg',
    qr: 'https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg'
  }
};

const auth = new google.auth.GoogleAuth({
  keyFile: 'noar-sserver-9c0924c3819f.json',  // เปลี่ยนเป็นชื่อไฟล์ JSON ที่มีจริง
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const userSelections = new Map();

// ฟังก์ชันดึงคีย์จาก Google Sheet
async function getAvailableKey(product) {
  const clientAuth = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: clientAuth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'sheet1!A2:C1000',
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return null;

  const rowIndex = rows.findIndex(r => r[1] !== 'yes' && r[2] === product);
  if (rowIndex === -1) return null;
  const key = rows[rowIndex][0];

  // อัปเดตสถานะเป็น used = yes
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `sheet1!B${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [['yes']] },
  });

  return key;
}

// คำสั่ง !shop
client.on(Events.MessageCreate, async (msg) => {
  if (!msg.content.startsWith('!shop')) return;

  const productOptions = Object.entries(PRODUCTS).map(([key, p]) => ({
    label: p.label,
    value: key,
    description: p.description,
    emoji: p.emoji
  }));

  const embed = new EmbedBuilder()
    .setTitle('NOAR SHOP')
    .setDescription('บอทจำหน่ายคีย์อัตโนมัติ โปรดเลือกสินค้าที่คุณต้องการ')
    .setColor(0x00ae86)
    .setImage(PRODUCTS.betterfivem.image);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_product')
    .setPlaceholder('เลือกสินค้าที่ต้องการ')
    .addOptions(productOptions);

  const orderBtn = new ButtonBuilder()
    .setCustomId('buy_button')
    .setLabel('📦 สั่งซื้อ')
    .setStyle(ButtonStyle.Primary);

  await msg.channel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(selectMenu),
      new ActionRowBuilder().addComponents(orderBtn)
    ]
  });
});

// จัดการ interaction
client.on(Events.InteractionCreate, async (interaction) => {
  const id = interaction.customId;

  if (interaction.isStringSelectMenu()) {
    const selected = interaction.values[0];
    userSelections.set(interaction.user.id, selected);
    await interaction.deferUpdate();
    return;
  }

  if (id === 'buy_button') {
    const productKey = userSelections.get(interaction.user.id);
    const product = PRODUCTS[productKey];
    if (!product) {
      return interaction.reply({ content: '⚠️ กรุณาเลือกสินค้าก่อนสั่งซื้อ', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🔔 ชำระเงินสำหรับ ${product.label}`)
      .setDescription(`📌 ยอดที่ต้องชำระ: **${product.price} บาท**\n\nสแกน QR ด้านล่าง แล้วกดปุ่ม "แจ้งชำระเงินสำเร็จ"`)
      .setImage(product.qr)
      .setColor(0x2ecc71);

    const confirmBtn = new ButtonBuilder()
      .setCustomId('confirm_pay')
      .setLabel('⚡ แจ้งชำระเงินสำเร็จ')
      .setStyle(ButtonStyle.Success);

    return interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(confirmBtn)],
      ephemeral: true
    });
  }

  if (id === 'confirm_pay') {
    const productKey = userSelections.get(interaction.user.id);
    const product = PRODUCTS[productKey];
    if (!product) return interaction.reply({ content: '❌ ไม่พบข้อมูลสินค้า', ephemeral: true });

    const date = new Date();
    date.setHours(date.getHours() + 7); // GMT+7
    const paidAt = date.toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const embed = new EmbedBuilder()
      .setTitle(`💰 แจ้งชำระเงินใหม่ - ${product.label}`)
      .setDescription(`จาก: ${interaction.user.tag} (${interaction.user.id})`)
      .addFields(
        { name: '📅 วันที่ชำระ', value: paidAt, inline: true },
        { name: '💵 จำนวนเงิน', value: `${product.price} บาท`, inline: true }
      )
      .setThumbnail(product.image)
      .setColor(0xf1c40f);

    const confirm = new ButtonBuilder()
      .setCustomId(`admin_confirm_${interaction.user.id}`)
      .setLabel('✅ ยืนยัน')
      .setStyle(ButtonStyle.Success);

    const cancel = new ButtonBuilder()
      .setCustomId(`admin_cancel_${interaction.user.id}`)
      .setLabel('❌ ยกเลิก')
      .setStyle(ButtonStyle.Danger);

    await client.channels.cache.get(ADMIN_CHANNEL_ID).send({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(confirm, cancel)]
    });

    return interaction.reply({ content: '📤 แจ้งชำระแล้ว รอแอดมินตรวจสอบนะคะ', ephemeral: true });
  }

  if (id.startsWith('admin_confirm_')) {
    const userId = id.split('_')[2];
    const productKey = userSelections.get(userId);
    const product = PRODUCTS[productKey];
    const key = await getAvailableKey(productKey);
    if (!key) return interaction.reply({ content: '❌ ไม่พบคีย์ในระบบ', ephemeral: true });

    const member = await interaction.guild.members.fetch(userId);
    await member.send(`🔑 ขอบคุณสำหรับการสั่งซื้อ **${product.label}**\n\nคีย์ของคุณคือ:\n\`\`\`${key}\`\`\``).catch(console.error);
    await member.roles.add(ROLE_ID).catch(console.error);

    await interaction.reply({ content: `✅ ส่งคีย์ให้ <@${userId}> เรียบร้อย`, ephemeral: true });

    // แจ้งแอดมินว่าส่งคีย์เรียบร้อย
    await client.channels.cache.get(ADMIN_CHANNEL_ID).send(`✅ ส่งคีย์ **${key}** ให้ <@${userId}> เรียบร้อยแล้วค่ะ`);

    return;
  }

  if (id.startsWith('admin_cancel_')) {
    const userId = id.split('_')[2];
    await interaction.deferUpdate();

    const member = await interaction.guild.members.fetch(userId);
    await member.send(`❌ การสั่งซื้อของคุณถูกยกเลิกโดยแอดมิน`).catch(console.error);

    return interaction.followUp({ content: `🛑 ยกเลิกคำสั่งซื้อของ <@${userId}> เรียบร้อย`, ephemeral: true });
  }
});

client.login(process.env.TOKEN);
