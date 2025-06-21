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

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const ADMIN_CHANNEL_ID = '1385951413229850634'; // 🔁 แก้เป็นช่องที่ใช้จริง
let orderQueue = 1;
const pendingOrders = new Map(); // สำหรับเก็บออเดอร์ที่เลือกไว้

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛍️ BlackPulse Shop')
      .setDescription('เลือกสินค้าที่ต้องการ แล้วกดปุ่ม "สั่งซื้อเลย" เพื่อเริ่มต้นการสั่งซื้อ')
      .setImage('https://postimg.cc/zVLTWzm5')
      .setColor(0x00ccff);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_product')
      .setPlaceholder('📦 เลือกสินค้า')
      .addOptions([
        { label: 'BoostFPS', value: 'boostfps', description: '129 บาท' },
        { label: 'Network Tweaker', value: 'network', description: '149 บาท' },
        { label: 'Memory Cleaner', value: 'memory', description: '99 บาท' },
        { label: 'Auto DLL Builder', value: 'dll', description: '179 บาท' },
        { label: 'All-in-One Pack', value: 'all', description: '249 บาท' },
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

// ⏬ เมื่อเลือกรายการ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_product') return;

  const product = interaction.values[0];
  pendingOrders.set(interaction.user.id, product);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_order')
      .setLabel('🛒 สั่งซื้อเลย')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    content: `📦 คุณเลือก: **${product}**\nคลิกปุ่มด้านล่างเพื่อสั่งซื้อเลย!`,
    components: [row],
    ephemeral: true,
  });
});

// ⏬ เมื่อกดปุ่มสั่งซื้อ
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'confirm_order') return;

  const user = interaction.user;
  const guild = interaction.guild;
  const product = pendingOrders.get(user.id);

  const priceMap = {
    boostfps: 129,
    network: 149,
    memory: 99,
    dll: 179,
    all: 249,
  };
  const price = priceMap[product];

  const role = await guild.roles.create({
    name: `🛍️ Order ${user.username}`,
    permissions: [PermissionsBitField.Flags.ViewChannel],
  });

  const channel = await guild.channels.create({
    name: `📁-ออเดอร์-${orderQueue}`,
    type: 0,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
    ],
  });

  await guild.members.cache.get(user.id).roles.add(role);

  const embed = new EmbedBuilder()
    .setTitle(`📦 สั่งซื้อ: ${product.toUpperCase()}`)
    .setDescription(`💰 ราคา: ${price} บาท\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบหลักฐานในห้องนี้เลยค่ะ`)
    .setImage('https://postimg.cc/HVGbwGTy') // 🔁 ใส่ลิงก์ QR ของตัวเอง
    .setColor(0x00ff00);

  await channel.send({ content: `<@${user.id}>`, embeds: [embed] });

  orderQueue++;

  // ฟังแนบรูป
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
      content: `📥 ออเดอร์จาก <@${user.id}> - สินค้า: ${product.toUpperCase()} - ราคา: ${price} บาท\nช่อง: <#${channel.id}>`,
      files: [slip],
    });

    await message.reply('✅ ส่งหลักฐานแล้ว รอแอดมินตรวจสอบสักครู่นะคะ');
  } catch (err) {
    await channel.send('⏰ ไม่ได้รับหลักฐานภายใน 5 นาที กรุณาสั่งซื้อใหม่');
  }
});

client.login(process.env.TOKEN);
