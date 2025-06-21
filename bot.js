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
} = require('discord.js');

const { google } = require('googleapis');
const fs = require('fs');

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
const SHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';

const auth = new google.auth.GoogleAuth({
  keyFile: 'noar-sserver-9c0924c3819f.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const pendingOrders = new Map();
const priceMap = {
  boostfps: 129,
  network: 149,
  memory: 99,
  dll: 179,
  all: 249,
};

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!createmenu') {
    const embed = new EmbedBuilder()
      .setTitle('🛍️ BlackPulse Shop')
      .setDescription('เลือกสินค้าที่ต้องการ แล้วกด "🛒 สั่งซื้อเลย"')
      .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385980365969293523/xxxx.gif')
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

    const row1 = new ActionRowBuilder().addComponents(select);
    const row2 = new ActionRowBuilder().addComponents(button);

    await msg.channel.send({ embeds: [embed], components: [row1, row2] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_product') return;
  pendingOrders.set(interaction.user.id, interaction.values[0]);
  await interaction.deferUpdate();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton() || interaction.customId !== 'confirm_order') return;

  const user = interaction.user;
  const guild = interaction.guild;
  const product = pendingOrders.get(user.id);

  if (!product) return interaction.reply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ', ephemeral: true });

  const price = priceMap[product];

  const role = await guild.roles.create({
    name: `🛍️-${user.username}`,
    permissions: [PermissionsBitField.Flags.ViewChannel],
  });

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
  await interaction.reply({ content: `✅ สร้างห้อง <#${channel.id}> เรียบร้อยแล้ว`, ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
    .setDescription(`💰 ราคา: **${price} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
    .setColor(0x00ff00);

  await channel.send({ content: `<@${user.id}>`, embeds: [embed] });

  const filter = (m) => m.author.id === user.id && m.attachments.size > 0 && m.attachments.first().contentType?.startsWith('image/');

  try {
    const collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
    const message = collected.first();
    const slip = message.attachments.first();

    const approveButton = new ButtonBuilder().setCustomId('approve_order').setLabel('✅ อนุมัติ').setStyle(ButtonStyle.Success);
    const rejectButton = new ButtonBuilder().setCustomId('reject_order').setLabel('❌ ยกเลิก').setStyle(ButtonStyle.Danger);
    const actionRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({
      content: `📥 ออเดอร์จาก <@${user.id}>\n📦 สินค้า: **${product.toUpperCase()}**\n💸 ราคา: **${price} บาท**\n🗂️ ห้อง: <#${channel.id}>`,
      files: [slip],
      components: [actionRow],
    });
  } catch (err) {
    await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่โดยพิมพ์ `!shop`');
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const channel = interaction.channel;
  const userId = channel.name.split('-').pop();
  const member = await interaction.guild.members.fetch(userId);

  if (interaction.customId === 'approve_order') {
    const authClient = await auth.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A2:B',
    });

    const rows = res.data.values || [];
    const available = rows.find((row) => !row[1]);

    if (!available) return interaction.reply({ content: '❌ ไม่พบคีย์ว่าง', ephemeral: true });

    const key = available[0];
    const rowIndex = rows.findIndex((r) => r[0] === key) + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Sheet1!B${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[`ใช้โดย ${member.user.tag}`]] },
    });

    await channel.send(`<@${userId}> ✅ คำสั่งซื้อของคุณได้รับการอนุมัติแล้วจ้า~\n🔑 คีย์ใช้งาน: \`${key}\``);
    await member.roles.remove(member.roles.cache.find((r) => r.name.startsWith('🛍️-')));
    await channel.delete();
  } else if (interaction.customId === 'reject_order') {
    await channel.send(`<@${userId}> ❌ คำสั่งซื้อถูกยกเลิกเนื่องจากไม่ได้รับการอนุมัติค่ะ`);
    setTimeout(async () => {
      await member.roles.remove(member.roles.cache.find((r) => r.name.startsWith('🛍️-')));
      await channel.delete();
    }, 120000);
  }
});

client.login(process.env.TOKEN);
