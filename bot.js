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
  ChannelType
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const ADMIN_CHANNEL_ID = '1385951413229850634';
const ADMIN_ROLE_ID = '1384125348610048130'; // เปลี่ยนตามจริง
const CATEGORY_ID = '1385950753763623062'; // หมวดหมู่ที่จะสร้างช่องใหม่

const productCatalog = {
  boostfps: { name: 'BoostFPS', price: 129 },
  network: { name: 'Network Tweaker', price: 149 },
  visual: { name: 'Visual Remover', price: 99 },
  autoloot: { name: 'FiveM AutoLoot', price: 179 },
  stutterfix: { name: 'AntiStutter Pack', price: 139 }
};

const pendingOrders = new Map();

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛒 BlackPulse Shop')
      .setDescription('เลือกสินค้าเพื่อสั่งซื้อได้เลย!')
      .setColor(0x00ccff);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_type')
      .setPlaceholder('📦 เลือกสินค้า')
      .addOptions(Object.entries(productCatalog).map(([value, { name, price }]) => ({
        label: name,
        value,
        description: `ราคา ${price} บาท`
      })));

    const row = new ActionRowBuilder().addComponents(select);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'select_type') return;

  const productId = interaction.values[0];
  const product = productCatalog[productId];
  if (!product) return;

  // สร้างห้องใหม่
  const guild = interaction.guild;
  if (!guild) return;

  const channelName = `order-${interaction.user.username.toLowerCase()}-${Date.now()}`;

  // สร้าง permission ให้เฉพาะแอดมินกับผู้ใช้คนสั่งเห็น
  const permissionOverwrites = [
    {
      id: guild.roles.everyone, // ปิดไม่ให้คนทั่วไปเข้าช่องนี้
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: interaction.user.id, // ให้เจ้าของช่องเข้าถึงได้
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles],
    },
    {
      id: ADMIN_ROLE_ID, // ให้แอดมินเข้าถึงได้
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ManageMessages],
    }
  ];

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites
    });

    pendingOrders.set(interaction.user.id, { type: productId, channelId: channel.id });

    await interaction.reply({
      content: `✅ สร้างช่องคำสั่งซื้อส่วนตัวให้คุณแล้ว: <#${channel.id}> กรุณาแนบหลักฐานชำระเงินในช่องนี้`,
      ephemeral: true
    });

    // ส่งข้อความต้อนรับในช่องใหม่
    const welcomeEmbed = new EmbedBuilder()
      .setTitle('🧾 คำสั่งซื้อของคุณ')
      .setDescription(`คุณเลือกสินค้า: **${product.name}**\nราคา: **${product.price} บาท**\n\nโปรดแนบรูปหลักฐานการชำระเงินในช่องนี้ และรอแอดมินตรวจสอบ`)
      .setColor(0x00ff00);

    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed] });

  } catch (err) {
    console.error('❌ สร้างช่องคำสั่งซื้อไม่สำเร็จ:', err);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ เกิดข้อผิดพลาดในการสร้างช่องคำสั่งซื้อ กรุณาลองใหม่อีกครั้ง', ephemeral: true });
    }
  }
});

// ส่วนตรวจจับไฟล์แนบในช่องที่สร้าง
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  const order = pendingOrders.get(msg.author.id);
  if (!order) return;

  if (msg.channel.id !== order.channelId) return; // ต้องอยู่ในช่องคำสั่งซื้อส่วนตัวเท่านั้น
  if (msg.attachments.size === 0) return; // ต้องแนบไฟล์เท่านั้น

  // ส่งหลักฐานไปแอดมิน
  try {
    const guild = msg.guild;
    const adminRole = guild.roles.cache.get(ADMIN_ROLE_ID);
    if (!adminRole) return;

    // ส่งข้อความในแชทแอดมิน (หรือจะเปลี่ยนเป็นส่งในช่องแอดมินก็ได้)
    const adminMsg = await msg.channel.send({
      content: `📥 คำสั่งซื้อจาก <@${msg.author.id}>\nสินค้า: ${productCatalog[order.type].name}\nโปรดตรวจสอบหลักฐานชำระเงิน`,
      files: [...msg.attachments.values()]
    });

    // แจ้งลูกค้า
    await msg.reply('✅ เราได้รับหลักฐานการชำระเงินแล้ว รอแอดมินตรวจสอบนะคะ');

  } catch (err) {
    console.error('❌ ส่งหลักฐานไปแอดมินไม่สำเร็จ:', err);
  }
});

client.login(process.env.TOKEN);
