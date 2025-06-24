// bot.js
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
  Partials,
  PermissionsBitField,
} = require('discord.js');
const { getAvailableKey, markKeyUsed } = require('./googleSheetsHelper');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const EPHEMERAL_FLAG = 1 << 6;
const priceMap = { BetterFiveM: 49 };

// กำหนด ID ช่องแอดมิน และ ID ยศ donation ที่จะเพิ่มให้
const ADMIN_CHANNEL_ID = '1386017253467619540';
const DONATION_ROLE_ID = '1386018737005658273';

// เก็บคำสั่งซื้อรอ confirm
const pendingOrders = new Map();

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// คำสั่งสร้างเมนู
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!createmenu') {
    const embed = {
      title: '🛍️ BlackPulse Shop',
      description: 'เลือกสินค้าที่ต้องการ แล้วกดสั่งซื้อ',
      color: 0x00ccff,
      image: {
        url: 'https://cdn.discordapp.com/attachments/1384470774668197998/1385980365969293523/xxxx.gif',
      },
    };

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_product')
      .setPlaceholder('📦 เลือกสินค้า')
      .addOptions(Object.entries(priceMap).map(([key, price]) => ({
        label: key.toUpperCase(),
        value: key,
        description: `${price} บาท`
      })));

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
  try {
    // เลือกสินค้า
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.deferUpdate();
      return;
    }

    // กดสั่งซื้อ
    if (interaction.isButton() && interaction.customId === 'confirm_order') {
      const userId = interaction.user.id;
      const product = pendingOrders.get(userId);

      if (!product) {
        await interaction.reply({
          content: '❌ กรุณาเลือกสินค้าก่อนนะคะ',
          flags: EPHEMERAL_FLAG,
        });
        return;
      }

      // สร้างปุ่มแจ้งชำระเงิน
      const payButton = new ButtonBuilder()
        .setCustomId(`user_paid_${userId}_${product}`)
        .setLabel('📤 แจ้งชำระเงิน')
        .setStyle(ButtonStyle.Primary);

      // ข้อความสั่งซื้อ พร้อมรูป QR (รูปเก่าของคุณ)
      const message = `


 🧾 สั่งซื้อ: ${product.toUpperCase()}
 💰 ราคา: ${priceMap[product]} บาท
 📌 สแกน QR นี้เพื่อชำระเงิน:

https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg`;

      await interaction.reply({
        content: message,
        components: [new ActionRowBuilder().addComponents(payButton)],
        flags: EPHEMERAL_FLAG,
      });
      return;
    }

    // ผู้ใช้กดแจ้งชำระเงิน
    if (interaction.isButton() && interaction.customId.startsWith('user_paid_')) {
      await interaction.deferReply({ ephemeral: true });
      const [_, userId, product] = interaction.customId.split('_');

      if (interaction.user.id !== userId) {
        await interaction.followUp({ content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้', ephemeral: true });
        return;
      }

      // แจ้งแอดมิน
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
      if (!adminChannel) {
        await interaction.followUp({ content: '❌ ไม่พบช่องแอดมิน กรุณาติดต่อผู้ดูแล', ephemeral: true });
        return;
      }

      const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const adminMsg = `
📢 ลูกค้า <@${userId}> แจ้งชำระเงิน
สินค้า: ${product.toUpperCase()}
ราคา: ${priceMap[product]} บาท
เวลาโอน: ${now}
      `;

      const approveBtn = new ButtonBuilder()
        .setCustomId(`approve_${userId}_${product}`)
        .setLabel('✅ ยืนยัน')
        .setStyle(ButtonStyle.Success);

      const rejectBtn = new ButtonBuilder()
        .setCustomId(`reject_${userId}_${product}`)
        .setLabel('❌ ยกเลิก')
        .setStyle(ButtonStyle.Danger);

      await adminChannel.send({
        content: adminMsg,
        components: [new ActionRowBuilder().addComponents(approveBtn, rejectBtn)],
      });

      await interaction.followUp({ content: '⏳ รอสักครู่ รอแอดมินตรวจสอบ', ephemeral: true });
      return;
    }

    // แอดมินกดยืนยัน หรือยกเลิก
    if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('reject_'))) {
      await interaction.deferUpdate();

      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        await interaction.followUp({ content: '❌ คุณไม่มีสิทธิ์กดปุ่มนี้', ephemeral: true });
        return;
      }

      const [action, userId, product] = interaction.customId.split('_');

      if (action === 'approve') {
        const guild = interaction.guild;
        if (!guild) return;

        try {
          const member = await guild.members.fetch(userId);
          const keyData = await getAvailableKey(product);

          if (!keyData) {
            await interaction.followUp({ content: '❌ คีย์สำหรับสินค้านี้หมดแล้ว', ephemeral: true });
            return;
          }

          const { key, rowIndex } = keyData;

          // เพิ่มยศ donation
          if (DONATION_ROLE_ID) {
            await member.roles.add(DONATION_ROLE_ID).catch(() => {});
          }

          // ส่งคีย์ให้ลูกค้าในช่องเดิม (DM)
          const user = await client.users.fetch(userId);
          await user.send(`✅ การสั่งซื้อของคุณได้รับการยืนยันแล้ว! คีย์ของคุณคือ:\n\`${key}\``).catch(() => {});

          // อัพเดตสถานะคีย์ใน Google Sheet ว่าถูกใช้แล้ว
          await markKeyUsed(rowIndex, userId);

          await interaction.followUp({ content: `✅ ส่งคีย์ให้ <@${userId}> เรียบร้อยแล้ว`, ephemeral: true });
        } catch (err) {
          console.error('Error handling admin approval:', err);
          await interaction.followUp({ content: '❌ เกิดข้อผิดพลาดในการดำเนินการ', ephemeral: true });
        }
      } else if (action === 'reject') {
        // ส่งข้อความแจ้งลูกค้า ยกเลิก
        const user = await client.users.fetch(userId);
        await user.send(`❌ การชำระเงินของคุณถูกยกเลิก กรุณาติดต่อแอดมิน`).catch(() => {});

        await interaction.followUp({ content: `❌ แจ้งลูกค้า <@${userId}> ว่าถูกยกเลิกแล้ว`, ephemeral: true });
      }
      return;
    }
  } catch (err) {
    console.error('❌ Error handling interaction:', err);
  }
});

client.login(process.env.TOKEN);
