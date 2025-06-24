const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
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

const EPHEMERAL_FLAG = 1 << 6;

const priceMap = {
  BetterFiveM: 49,
};

const pendingOrders = new Map();

const SHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';
const ADMIN_CHANNEL_ID = '1386017253467619540';
const DONATOR_ROLE_ID = '1386018737005658273';

const auth = new google.auth.GoogleAuth({
  keyFile: 'noar-sserver-9c0924c3819f.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

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
      .addOptions(
        Object.entries(priceMap).map(([key, price]) => ({
          label: key.toUpperCase(),
          value: key,
          description: `${price} บาท`,
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
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.deferUpdate();
      return;
    }

    if (interaction.isButton()) {
      // กดสั่งซื้อ
      if (interaction.customId === 'confirm_order') {
        const user = interaction.user;
        const product = pendingOrders.get(user.id);

        if (!product) {
          return await interaction.reply({
            content: '❌ กรุณาเลือกสินค้าก่อนนะคะ',
            flags: EPHEMERAL_FLAG,
          });
        }

        const payButton = new ButtonBuilder()
          .setCustomId(`user_paid_${user.id}_${product}`)
          .setLabel('📤 แจ้งชำระเงิน')
          .setStyle(ButtonStyle.Primary);

        const message = `\n
╭───────────────
│ 🧾 สั่งซื้อ: ${product.toUpperCase()}
│ 💰 ราคา: ${priceMap[product]} บาท
│ 📌 สแกน QR นี้เพื่อชำระเงิน:
╰───────────────
https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg`;

        return await interaction.reply({
          content: message,
          components: [new ActionRowBuilder().addComponents(payButton)],
          flags: EPHEMERAL_FLAG,
        });
      }

      // กดแจ้งชำระเงินจากลูกค้า
      if (interaction.customId.startsWith('user_paid_')) {
        const [_, userId, product] = interaction.customId.split('_');
        if (interaction.user.id !== userId) {
          return interaction.reply({
            content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้',
            flags: EPHEMERAL_FLAG,
          });
        }

        await interaction.reply({
          content: '⏳ รอสักครู่ กำลังแจ้งแอดมิน...',
          flags: EPHEMERAL_FLAG,
        });

        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
        const timeNow = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

        const approveBtn = new ButtonBuilder()
          .setCustomId(`approve_${userId}_${product}`)
          .setLabel('✅ ยืนยัน')
          .setStyle(ButtonStyle.Success);

        const rejectBtn = new ButtonBuilder()
          .setCustomId(`reject_${userId}_${product}`)
          .setLabel('❌ ยกเลิก')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

        await adminChannel.send({
          content: `📥 ลูกค้า <@${userId}> แจ้งชำระสินค้า **${product.toUpperCase()}** ราคา ${priceMap[product]} บาท\n🕒 เวลา: ${timeNow}`,
          components: [row],
        });

        return;
      }

      // แอดมินกดยืนยันหรือยกเลิก
      if (
        interaction.customId.startsWith('approve_') ||
        interaction.customId.startsWith('reject_')
      ) {
        const [action, userId, product] = interaction.customId.split('_');
        const guild = interaction.guild;

        await interaction.deferUpdate();

        const member = await guild.members.fetch(userId);

        if (action === 'approve') {
          const authClient = await auth.getClient();
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A2:B',
          });

          const rows = res.data.values || [];
          const available = rows.find((row) => !row[1]);

          if (!available) {
            return interaction.followUp({
              content: '❌ ไม่พบคีย์ว่างในสเปรดชีต',
              flags: EPHEMERAL_FLAG,
            });
          }

          const key = available[0];
          const rowIndex = rows.findIndex((r) => r[0] === key) + 2;

          await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `Sheet1!B${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[`ใช้โดย ${member.user.tag}`]] },
          });

          await member.roles.add(DONATOR_ROLE_ID);

          try {
            await member.send(
              `✅ ออเดอร์ของคุณได้รับการอนุมัติแล้วค่ะ\n🔑 คีย์ใช้งาน: \`${key}\`\nขอบคุณที่อุดหนุนนะคะ!`
            );
          } catch {
            await interaction.followUp({
              content: '⚠️ ไม่สามารถส่งข้อความส่วนตัวหาลูกค้าได้ โปรดแจ้งคีย์ด้วยตัวเอง',
              flags: EPHEMERAL_FLAG,
            });
          }

          return interaction.followUp({
            content: '✅ ยืนยันออเดอร์และส่งคีย์ให้ลูกค้าเรียบร้อย',
            flags: EPHEMERAL_FLAG,
          });
        }

        if (action === 'reject') {
          try {
            await member.send(
              '❌ ออเดอร์ของคุณถูกยกเลิกจากแอดมินค่ะ หากมีข้อสงสัยสามารถติดต่อได้ค่ะ'
            );
          } catch {}

          return interaction.followUp({
            content: '❌ ยกเลิกออเดอร์เรียบร้อย',
            flags: EPHEMERAL_FLAG,
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
});

client.login(process.env.TOKEN);
