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
const DONATOR_ROLE_ID = '1386003699444224160';
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
      .setDescription('เลือกสินค้าที่ท่านต้องการ แล้วกด "🛒 สั่งซื้อเลย"')
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

  if (!product) return interaction.reply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ', flags: 64 });

  const price = priceMap[product];

  const role = await guild.roles.create({
    name: `🛍️-${user.username}`,
    permissions: [PermissionsBitField.Flags.ViewChannel],
  });

  const channel = await guild.channels.create({
    name: `📁-order-${user.id}`,
    type: 0,
    parent: CATEGORY_ID,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
    ],
  });

  await guild.members.cache.get(user.id)?.roles.add(role);
  await interaction.reply({ content: `✅ สร้างห้อง <#${channel.id}> เรียบร้อยแล้ว`, flags: 64 });

  const embed = new EmbedBuilder()
    .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
    .setDescription(`💰 ราคา: **${price} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้ได้เลยค่ะ`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
    .setColor(0x00ff00);

  await channel.send({ content: `<@${user.id}>`, embeds: [embed] });

  const filter = (m) => m.author.id === user.id && m.attachments.size > 0 && m.attachments.first().contentType?.startsWith('image/');

  try {
    const collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
    const message = collected.first();
    const slip = message.attachments.first();

    // แจ้งลูกค้าเลยว่ารับเรื่องแล้ว
    await message.reply('✅ ส่งหลักฐานการชำระเงินให้แอดมินแล้ว รอแอดตรวจสอบประมาณ 3-5 นาทีครีบ~');

    const approveButton = new ButtonBuilder()
      .setCustomId(`approve_order_${user.id}`)
      .setLabel('✅ อนุมัติ')
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_order_${user.id}`)
      .setLabel('❌ ยกเลิก')
      .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({
      content: `📥 ออเดอร์จาก <@${user.id}>\n📦 สินค้า: **${product.toUpperCase()}**\n💸 ราคา: **${price} บาท**\n🗂️ ห้อง: <#${channel.id}>`,
      files: [slip],
      components: [actionRow],
    });
  } catch (err) {
    await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่');
    setTimeout(async () => {
      await guild.members.cache.get(user.id)?.roles.remove(role);
      await channel.delete();
    }, 5000);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  const [action, , userId] = interaction.customId.split('_');
  if (!userId) return;

  const guild = interaction.guild;
  const member = await guild.members.fetch(userId);

  // หา channel ของลูกค้า
  const orderChannel = guild.channels.cache.find(ch => ch.name === `📁-order-${userId}`);

  if (!orderChannel) {
    return interaction.reply({ content: '❌ ไม่พบห้องสั่งซื้อของลูกค้า', flags: 64 });
  }

  if (action === 'approve') {
    const authClient = await auth.getClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A2:B',
    });

    const rows = res.data.values || [];
    const available = rows.find((row) => !row[1]);
    if (!available) return interaction.reply({ content: '❌ ไม่พบคีย์ว่าง', flags: 64 });

    const key = available[0];
    const rowIndex = rows.findIndex((r) => r[0] === key) + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Sheet1!B${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[`ใช้โดย ${member.user.tag}`]] },
    });

    await member.roles.add(DONATOR_ROLE_ID);

    // ส่งคีย์ในห้องลูกค้าแทน
    await orderChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle('✅ คำสั่งซื้อได้รับการอนุมัติแล้ว')
          .setDescription(`คุณ <@${userId}>!\n🔑 คีย์เข้าใช้งานของคุณคือ: \`${key}\`\nโปรดจดจำคีย์ไว้ให้ดีหากทำหายแอดมินไม่รับผิดชอบทุกกรณี\nห้องจะถูกปิดใน 5 นาที`)
      ]
    });

    await interaction.reply({ content: '✅ อนุมัติคำสั่งซื้อเรียบร้อยแล้ว', flags: 64 });

    setTimeout(async () => {
      await member.roles.remove(member.roles.cache.find((r) => r.name.startsWith('🛍️-')));
      if (orderChannel.deletable) await orderChannel.delete();
    }, 5 * 60 * 1000);

  } else if (action === 'reject') {
    await interaction.reply({ content: 'กรุณาพิมพ์เหตุผลการยกเลิกภายใน 2 นาทีถัดไปในแชทนี้...', flags: 64 });

    const filter = (m) => m.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 120000 }).catch(() => {});
    const reason = collected?.first()?.content || 'ไม่ระบุเหตุผล';

    if (orderChannel) {
      await orderChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('❌ คำสั่งซื้อถูกยกเลิก')
            .setDescription(`คุณ <@${userId}> คำสั่งซื้อของคุณถูกยกเลิกด้วยเหตุผล : \n${reason}`)
        ]
      });
    }

    await interaction.channel.send('คำสั่งซื้อถูกยกเลิกแล้วและห้องจะถูกลบใน 2 นาที');

    setTimeout(async () => {
      await member.roles.remove(member.roles.cache.find((r) => r.name.startsWith('🛍️-')));
      if (orderChannel?.deletable) await orderChannel.delete();
    }, 2 * 60 * 1000);
  }
});

client.login(process.env.TOKEN);
