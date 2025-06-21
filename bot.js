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
  ChannelType,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ✅ แก้ 2 ตัวนี้ก่อนใช้งานจริง
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

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// !shop เรียกเมนูร้านค้า
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
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

    const rowSelect = new ActionRowBuilder().addComponents(select);
    const rowButton = new ActionRowBuilder().addComponents(button);

    await msg.channel.send({ embeds: [embed], components: [rowSelect, rowButton] });
  }
});

// เมื่อเลือกสินค้า → แค่บันทึกไว้ ไม่ตอบกลับใด ๆ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_product') return;

  const product = interaction.values[0];
  pendingOrders.set(interaction.user.id, product);
  await interaction.deferUpdate();
});

// กดปุ่มสั่งซื้อ → สร้างห้องใหม่ใน Category
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

  // ✅ สร้าง Role แยกให้ลูกค้าเห็นห้องตัวเองเท่านั้น
  const role = await guild.roles.create({
    name: `🛍️-${user.username}`,
    permissions: [PermissionsBitField.Flags.ViewChannel],
  });

  const channel = await guild.channels.create({
    name: `📁-order-${user.username.toLowerCase()}`,
    type: ChannelType.GuildText,
    parent: CATEGORY_ID,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
    ],
  });

  const member = await guild.members.fetch(user.id);
  await member.roles.add(role);

  const embed = new EmbedBuilder()
    .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
    .setDescription(`💰 ราคา: **${price} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้`)
    .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg?ex=68580998&is=6856b818&hm=bac10995cacb6ed40e581ba4d8c7cb11d7f362416bc7801e1198fe830881abaf&')
    .setColor(0x00ff00);

  await channel.send({ content: `<@${user.id}>`, embeds: [embed] });

  const filter = (m) =>
    m.author.id === user.id &&
    m.attachments.size > 0 &&
    m.attachments.first().contentType?.startsWith('image/');

  try {
    const collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
    const message = collected.first();
    const slip = message.attachments.first();

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({
      content: `📥 ออเดอร์จาก <@${user.id}> - สินค้า: ${product.toUpperCase()} - ราคา: ${price} บาท\nห้อง: <#${channel.id}>`,
      files: [slip],
    });

    await message.reply('✅ ส่งหลักฐานเรียบร้อยแล้วจ้า รอแอดมินตรวจสอบน้า~');
  } catch (err) {
    await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่โดยพิมพ์ `!shop`');
  }
});

client.login(process.env.TOKEN);
