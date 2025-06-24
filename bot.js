const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
  PermissionsBitField,
  EmbedBuilder,
  Partials,
} = require('discord.js');

const { google } = require('googleapis');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const ADMIN_CHANNEL_ID = '1386017253467619540';
const DONATOR_ROLE_ID = '1386018737005658273';
const SHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';

const auth = new google.auth.GoogleAuth({
  keyFile: 'noar-sserver-9c0924c3819f.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const priceMap = { BetterFiveM: 49 };
const pendingOrders = new Map();
const EPHEMERAL_FLAG = 1 << 6; // แทน ephemeral: true

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

// สร้างเมนูสินค้า + ปุ่มสั่งซื้อ
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
        description: `${price} บาท`,
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
    // เลือกสินค้า เก็บใน pendingOrders (ไม่ตอบ reply เพื่อไม่ให้ interaction หมดอายุเร็ว)
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      // deferUpdate() = ตอบแบบเงียบๆ ไม่แจ้ง user (เปลี่ยนชื่อสินค้าเฉย ๆ)
      return interaction.deferUpdate();
    }

    // กดปุ่มสั่งซื้อ
    if (interaction.isButton() && interaction.customId === 'confirm_order') {
      const user = interaction.user;
      const product = pendingOrders.get(user.id);

      if (!product) {
        return interaction.reply({
          content: '❌ กรุณาเลือกสินค้าก่อนนะคะ',
          flags: EPHEMERAL_FLAG,
        });
      }

      // ส่งข้อความให้สแกน QR พร้อมปุ่มแจ้งชำระเงิน
      const payButton = new ButtonBuilder()
        .setCustomId(`user_paid_${user.id}_${product}`)
        .setLabel('📤 แจ้งชำระเงิน')
        .setStyle(ButtonStyle.Primary);

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

    // กดแจ้งชำระเงินจาก user
    if (interaction.isButton() && interaction.customId.startsWith('user_paid_')) {
      const [_, userId, product] = interaction.customId.split('_');

      // เช็ค user ว่ากดปุ่มตัวเองไหม
      if (interaction.user.id !== userId) {
        // ถ้ายังไม่เคยตอบ interaction นี้
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้',
            flags: EPHEMERAL_FLAG,
          });
        } else {
          return interaction.followUp({
            content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้',
            flags: EPHEMERAL_FLAG,
          });
        }
      }

      // deferReply ก่อนทำงานหนัก
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      await interaction.followUp({
        content: '⏳ รอสักครู่ กำลังแจ้งแอดมิน...',
        ephemeral: true,
      });

      // แจ้งแอดมินในช่อง ADMIN_CHANNEL_ID
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
      const orderTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

      // ส่งปุ่มให้แอดมินกดยืนยัน / ยกเลิก
      const approveBtn = new ButtonBuilder()
        .setCustomId(`approve_${userId}_${product}`)
        .setLabel('✅ ยืนยัน')
        .setStyle(ButtonStyle.Success);

      const rejectBtn = new ButtonBuilder()
        .setCustomId(`reject_${userId}_${product}`)
        .setLabel('❌ ยกเลิก')
        .setStyle(ButtonStyle.Danger);

      const adminRow = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

      await adminChannel.send({
        content: `📥 ผู้ใช้ <@${userId}> แจ้งชำระเงิน\n🛒 สินค้า: **${product.toUpperCase()}**\n💸 ราคา: **${priceMap[product]} บาท**\n🕒 เวลา: ${orderTime}`,
        components: [adminRow],
      });

      return;
    }

    // แอดมินกดยืนยัน/ยกเลิก
    if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('reject_'))) {
      const [action, userId, product] = interaction.customId.split('_');
      const guild = interaction.guild;
      const member = await guild.members.fetch(userId);

      // deferUpdate ก่อน (ตอบแบบเงียบ)
      await interaction.deferUpdate();

      if (action === 'approve') {
        // ดึงคีย์จาก Google Sheets (คีย์ว่าง)
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: 'Sheet1!A2:B',
        });

        const rows = res.data.values || [];
        const available = rows.find(row => !row[1]); // หาแถวที่ช่อง B ว่าง = ยังไม่ใช้

        if (!available) {
          return interaction.followUp({
            content: '❌ ไม่พบคีย์ว่างใน Google Sheets',
            flags: EPHEMERAL_FLAG,
          });
        }

        const key = available[0];
        const rowIndex = rows.findIndex(r => r[0] === key) + 2;

        // อัปเดต Google Sheets ว่าใช้โดย user นี้
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `Sheet1!B${rowIndex}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[`ใช้โดย ${member.user.tag}`]] },
        });

        // เพิ่มยศ DONATOR ให้ user
        await member.roles.add(DONATOR_ROLE_ID);

        // ส่งคีย์กลับหา user ตรง interaction เดิม
        await interaction.followUp({
          content: `✅ <@${userId}> คีย์ของคุณ: \`${key}\`\nขอบคุณที่อุดหนุนค่ะ!`,
          flags: EPHEMERAL_FLAG,
        });
      } else if (action === 'reject') {
        // ถามเหตุผลยกเลิก (แจ้ง admin ใน channel เดิม)
        const filter = m => m.author.id === interaction.user.id;
        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

        await interaction.followUp({
          content: 'กรุณาพิมพ์เหตุผลการยกเลิกคำสั่งซื้อ (มีเวลา 2 นาที)',
          flags: EPHEMERAL_FLAG,
        });

        const collected = await adminChannel.awaitMessages({
          filter,
          max: 1,
          time: 120000,
        }).catch(() => null);

        const reason = collected?.first()?.content || 'ไม่ระบุเหตุผล';

        // แจ้ง user ว่าคำสั่งซื้อถูกยกเลิก
        try {
          await member.send(`❌ คำสั่งซื้อของคุณถูกยกเลิกด้วยเหตุผล: ${reason}`);
        } catch {
          // ถ้าส่ง DM ไม่ได้ก็ไม่เป็นไร
        }

        await interaction.followUp({
          content: `❌ คำสั่งซื้อของ <@${userId}> ถูกยกเลิกด้วยเหตุผล: ${reason}`,
          flags: EPHEMERAL_FLAG,
        });
      }

      return;
    }
  } catch (err) {
    console.error('❌ Error handling interaction:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ เกิดข้อผิดพลาดในการประมวลผลคำสั่ง',
          flags: EPHEMERAL_FLAG,
        });
      }
    } catch {}
  }
});

client.login(process.env.TOKEN);
