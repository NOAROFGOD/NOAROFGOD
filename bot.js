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

const { google } = require('googleapis');
const sheets = google.sheets('v4');

// กำหนด config ต่างๆ
const TOKEN = process.env.TOKEN;
const ADMIN_CHANNEL_ID = '1386017253467619540'; // ช่องแจ้งเตือนแอดมิน
const SHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';
const GOOGLE_API_CREDENTIALS = require('./noar-sserver-9c0924c3819f.json');
const EPHEMERAL_FLAG = 1 << 6;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const priceMap = { BetterFiveM: 49 };
const pendingOrders = new Map();

// ฟังก์ชันดึงคีย์จาก Google Sheet (สมมติคีย์อยู่ในแถวที่ยังไม่ใช้)
async function getKeyFromSheet(product) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_API_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    const request = {
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A2:C', // สมมติช่วงนี้มีข้อมูล product, key, used (true/false)
      auth: authClient,
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;

    if (!rows || rows.length === 0) return null;

    for (let i = 0; i < rows.length; i++) {
      const [sheetProduct, key, used] = rows[i];
      if (sheetProduct === product && used !== 'TRUE') {
        // อัปเดตเป็นใช้แล้ว
        const updateRequest = {
          spreadsheetId: SHEET_ID,
          range: `Sheet1!C${i + 2}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [['TRUE']],
          },
          auth: authClient,
        };
        await sheets.spreadsheets.values.update(updateRequest);
        return key;
      }
    }

    return null;
  } catch (err) {
    console.error('Error fetching key from Google Sheets:', err);
    return null;
  }
}

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
      components: [new ActionRowBuilder().addComponents(select), new ActionRowBuilder().addComponents(button)],
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      return;
    }

    if (interaction.isButton()) {
      const user = interaction.user;

      if (interaction.customId === 'confirm_order') {
        const product = pendingOrders.get(user.id);
        if (!product) {
          if (!interaction.deferred && !interaction.replied)
            await interaction.reply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ', flags: EPHEMERAL_FLAG });
          else await interaction.editReply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ' });
          return;
        }

        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

        const payButton = new ButtonBuilder()
          .setCustomId(`user_paid_${user.id}_${product}`)
          .setLabel('📤 แจ้งชำระเงิน')
          .setStyle(ButtonStyle.Primary);

        const message = `
╭───────────────
│ 🧾 สั่งซื้อ: ${product.toUpperCase()}
│ 💰 ราคา: ${priceMap[product]} บาท
│ 📌 สแกน QR นี้เพื่อชำระเงิน:
╰───────────────
https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg`;

        await interaction.editReply({
          content: message,
          components: [new ActionRowBuilder().addComponents(payButton)],
        });

        return;
      }

      if (interaction.customId.startsWith('user_paid_')) {
        const parts = interaction.customId.split('_');
        const userIdFromCustomId = parts[2];
        const product = parts.slice(3).join('_');

        if (user.id.toString() !== userIdFromCustomId) {
          if (!interaction.deferred && !interaction.replied)
            await interaction.reply({ content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้', flags: EPHEMERAL_FLAG });
          else await interaction.editReply({ content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้' });
          return;
        }

        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

        // แจ้ง admin channel
        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
        const now = new Date();
        await adminChannel.send({
          content: `👤 ลูกค้า <@${user.id}> แจ้งชำระเงิน\n- สินค้า: ${product}\n- ราคา: ${priceMap[product]} บาท\n- เวลา: ${now.toLocaleString()}`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`admin_confirm_${user.id}_${product}`)
                .setLabel('✅ ยืนยัน')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`admin_cancel_${user.id}_${product}`)
                .setLabel('❌ ยกเลิก')
                .setStyle(ButtonStyle.Danger)
            ),
          ],
        });

        await interaction.editReply({ content: '✅ แจ้งชำระเงินเรียบร้อย กรุณารอแอดมินตรวจสอบ' });

        return;
      }

      if (interaction.customId.startsWith('admin_confirm_')) {
        const parts = interaction.customId.split('_');
        const userId = parts[2];
        const product = parts.slice(3).join('_');

        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

        // ดึงคีย์จาก Google Sheet
        const key = await getKeyFromSheet(product);

        if (!key) {
          await interaction.editReply({ content: '❌ ไม่มีคีย์เหลือในสต็อก' });
          return;
        }

        // ส่งคีย์ให้ user ที่ซื้อในแชนเนลเดิม (ส่ง DM หรือในช่องที่เขาสั่งซื้อ)
        const userObj = await client.users.fetch(userId);
        const guild = interaction.guild;
        if (guild) {
          try {
            // เพิ่มยศ donation
            const member = await guild.members.fetch(userId);
            const donationRole = guild.roles.cache.find((r) => r.name.toLowerCase() === 'donation');
            if (donationRole && member) {
              await member.roles.add(donationRole, 'ได้รับยศหลังซื้อสินค้า');
            }
          } catch (err) {
            console.warn('ไม่สามารถเพิ่มยศให้สมาชิก:', err);
          }
        }

        try {
          await userObj.send(`🎉 ขอบคุณที่ซื้อสินค้า! นี่คือคีย์ของคุณสำหรับ ${product}:\n\`${key}\``);
        } catch (err) {
          console.warn('ส่งข้อความ DM ไม่ได้:', err);
        }

        await interaction.editReply({ content: `✅ ยืนยันการขายและส่งคีย์ให้ <@${userId}> เรียบร้อย` });

        return;
      }

      if (interaction.customId.startsWith('admin_cancel_')) {
        const parts = interaction.customId.split('_');
        const userId = parts[2];
        const product = parts.slice(3).join('_');

        if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });

        await interaction.editReply({ content: `❌ แอดมินยกเลิกคำสั่งซื้อของ <@${userId}> สำหรับสินค้า ${product}` });

        try {
          const userObj = await client.users.fetch(userId);
          await userObj.send(`❌ คำสั่งซื้อของคุณสำหรับสินค้า ${product} ถูกยกเลิกโดยแอดมิน`);
        } catch {}

        return;
      }
    }
  } catch (err) {
    console.error('❌ Error handling interaction:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', ephemeral: true });
      }
    } catch {}
  }
});

client.login(TOKEN);
