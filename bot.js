const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
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

const EPHEMERAL_FLAG = 1 << 6; // ephemeral

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
      // เซฟสินค้าไว้รอดีเลย์ตอบ
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.deferUpdate();
    } else if (interaction.isButton()) {
      // ปุ่มสั่งซื้อ
      if (interaction.customId === 'confirm_order') {
        const user = interaction.user;
        const product = pendingOrders.get(user.id);

        if (!product) {
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply({
              content: '❌ กรุณาเลือกสินค้าก่อนนะคะ',
              flags: EPHEMERAL_FLAG,
            });
          } else {
            return await interaction.followUp({
              content: '❌ กรุณาเลือกสินค้าก่อนนะคะ',
              flags: EPHEMERAL_FLAG,
            });
          }
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

        await interaction.reply({
          content: message,
          components: [new ActionRowBuilder().addComponents(payButton)],
          flags: EPHEMERAL_FLAG,
        });
      }
      // ปุ่มแจ้งชำระเงิน user
      else if (interaction.customId.startsWith('user_paid_')) {
        const [_, userId, product] = interaction.customId.split('_');

        // เช็คว่าคนกดคือเจ้าของ interaction จริงๆ
        if (interaction.user.id !== userId) {
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้',
                flags: EPHEMERAL_FLAG,
              });
            } else {
              await interaction.followUp({
                content: '❌ คุณไม่สามารถแจ้งชำระเงินแทนคนอื่นได้',
                flags: EPHEMERAL_FLAG,
              });
            }
          } catch (e) {
            console.log('Ignored interaction error:', e.message);
          }
          return;
        }

        await interaction.deferReply({ flags: EPHEMERAL_FLAG });

        // แจ้งลูกค้า
        await interaction.editReply('⏳ รอสักครู่ กำลังแจ้งแอดมิน...');

        // ส่งข้อมูลไปช่องแอดมิน
        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

        const orderInfo = `
📥 ออเดอร์จาก <@${userId}>
📦 สินค้า: **${product.toUpperCase()}**
💸 ราคา: **${priceMap[product]} บาท**
🕒 เวลาที่แจ้ง: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
`;

        const approveBtn = new ButtonBuilder()
          .setCustomId(`approve_${userId}_${product}`)
          .setLabel('✅ ยืนยัน')
          .setStyle(ButtonStyle.Success);

        const rejectBtn = new ButtonBuilder()
          .setCustomId(`reject_${userId}_${product}`)
          .setLabel('❌ ปฏิเสธ')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

        await adminChannel.send({ content: orderInfo, components: [row] });

        await interaction.followUp({
          content: '✅ แจ้งแอดมินเรียบร้อย รอการตรวจสอบ',
          flags: EPHEMERAL_FLAG,
        });
      }
      // ปุ่มแอดมินกดยืนยันหรือปฏิเสธ
      else if (
        interaction.customId.startsWith('approve_') ||
        interaction.customId.startsWith('reject_')
      ) {
        const [action, userId, product] = interaction.customId.split('_');
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId);

        await interaction.deferUpdate();

        if (action === 'approve') {
          // ดึงข้อมูล Google Sheet
          const authClient = await auth.getClient();
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A2:B',
          });

          const rows = res.data.values || [];
          const availableRow = rows.findIndex((row) => !row[1]);
          if (availableRow === -1) {
            await interaction.followUp({
              content: '❌ ไม่มีคีย์ว่างในระบบ',
              flags: EPHEMERAL_FLAG,
            });
            return;
          }

          const key = rows[availableRow][0];
          const rowIndex = availableRow + 2;

          // อัพเดตใน Sheet ว่าคีย์ถูกใช้โดย user นี้
          await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `Sheet1!B${rowIndex}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[`ใช้โดย ${member.user.tag}`]] },
          });

          // ใส่ role donation ให้ user
          await member.roles.add(DONATOR_ROLE_ID);

          // ส่งคีย์กลับหาลูกค้า
          try {
            await interaction.followUp({
              content: `✅ อนุมัติคำสั่งซื้อของคุณ <@${userId}> แล้วค่ะ\n🔑 คีย์ใช้งาน: \`${key}\``,
              flags: EPHEMERAL_FLAG,
            });

            // ถ้าอยากส่งข้อความในช่องเดิมของ user ให้ใช้ DM แทน (ถ้าเปิดรับ)
            // await member.send(`🔑 คีย์ใช้งาน: \`${key}\``);
          } catch (e) {
            console.error('ส่งข้อความคีย์ลูกค้าไม่สำเร็จ:', e);
          }
        } else if (action === 'reject') {
          // รอแอดมินพิมพ์เหตุผลปฏิเสธ
          const filter = (m) => m.author.id === interaction.user.id;
          const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

          await interaction.followUp({
            content: 'กรุณาพิมพ์เหตุผลที่ปฏิเสธคำสั่งซื้อนี้ (ภายใน 2 นาที)',
            flags: EPHEMERAL_FLAG,
          });

          try {
            const collected = await adminChannel.awaitMessages({
              filter,
              max: 1,
              time: 120000,
              errors: ['time'],
            });
            const reason = collected.first().content || 'ไม่ระบุเหตุผล';

            await interaction.followUp({
              content: `❌ ปฏิเสธคำสั่งซื้อของ <@${userId}> ด้วยเหตุผล: ${reason}`,
              flags: EPHEMERAL_FLAG,
            });

            // แจ้งลูกค้า
            try {
              await (await guild.members.fetch(userId)).send(
                `❌ คำสั่งซื้อของคุณถูกปฏิเสธด้วยเหตุผล: ${reason}`
              );
            } catch {}

          } catch {
            await interaction.followUp({
              content: '❌ หมดเวลาในการพิมพ์เหตุผล',
              flags: EPHEMERAL_FLAG,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
  }
});

client.login(process.env.TOKEN);
