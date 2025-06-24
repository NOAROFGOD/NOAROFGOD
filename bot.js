const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events
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
  try {
    // เลือกสินค้า
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.deferUpdate(); // ตอบแบบเงียบ
      return;
    }

    if (!interaction.isButton()) return;

    // กดปุ่มสั่งซื้อ
    if (interaction.customId === 'confirm_order') {
      await interaction.deferReply({ ephemeral: true });

      const product = pendingOrders.get(interaction.user.id);
      if (!product) {
        return await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setDescription('❌ กรุณาเลือกสินค้าก่อนนะคะ'),
          ],
        });
      }

      const productEmbed = new EmbedBuilder()
        .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
        .setDescription(`💰 ราคา: **${priceMap[product]} บาท**\n📌 โปรดสแกน QR ด้านล่างเพื่อชำระเงิน แล้วกดปุ่ม "📤 แจ้งชำระเงิน" ด้านล่าง`)
        .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
        .setColor(0x00ff00);

      const payConfirmButton = new ButtonBuilder()
        .setCustomId(`user_paid_${interaction.user.id}_${product}`)
        .setLabel('📤 แจ้งชำระเงิน')
        .setStyle(ButtonStyle.Primary);

      await interaction.editReply({
        embeds: [productEmbed],
        components: [new ActionRowBuilder().addComponents(payConfirmButton)],
      });
      return;
    }

    // ลูกค้ากดแจ้งชำระเงิน
    if (interaction.customId.startsWith('user_paid_')) {
      await interaction.deferUpdate();

      const [, , userId, product] = interaction.customId.split('_');
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

      const approveButton = new ButtonBuilder()
        .setCustomId(`approve_order_${userId}_${product}`)
        .setLabel('✅ อนุมัติ')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`reject_order_${userId}_${product}`)
        .setLabel('❌ ยกเลิก')
        .setStyle(ButtonStyle.Danger);

      const actionRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

      await adminChannel.send({
        content: `📥 แจ้งชำระเงินจาก <@${userId}>\n📦 สินค้า: **${product.toUpperCase()}**\n💸 ราคา: **${priceMap[product]} บาท**`,
        components: [actionRow],
      });
      return;
    }

    // แอดมินกดยืนยันอนุมัติ
    if (interaction.customId.startsWith('approve_order_')) {
      await interaction.deferUpdate();

      const [, , userId, product] = interaction.customId.split('_');
      const guild = interaction.guild;

      let member;
      try {
        member = await guild.members.fetch(userId);
      } catch {
        return interaction.followUp({
          content: '⚠️ ไม่พบสมาชิกนี้แล้ว',
          ephemeral: true,
        });
      }

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A2:B',
      });

      const rows = res.data.values || [];
      const available = rows.find((row) => !row[1]);
      if (!available) {
        return interaction.followUp({
          content: '❌ ไม่พบคีย์ว่าง',
          ephemeral: true,
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

      await member.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ อนุมัติคำสั่งซื้อ')
            .setDescription(`🔑 คีย์ของคุณ : \`${key}\`\n📌 ขอบคุณที่สนับสนุนค่ะ`)
            .setColor('Green'),
        ],
      });

      await interaction.followUp({
        content: `✅ อนุมัติคำสั่งซื้อของ <@${userId}> เรียบร้อย`,
        ephemeral: true,
      });
      return;
    }

    // แอดมินกดยกเลิก
    if (interaction.customId.startsWith('reject_order_')) {
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.customId.split('_')[2];
      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);

      await interaction.editReply({ content: '📩 โปรดพิมพ์เหตุผลที่ยกเลิกคำสั่งซื้อ' });

      const filter = (m) => m.author.id === interaction.user.id;
      const collected = await adminChannel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
      const reason = collected?.first()?.content || 'ไม่ระบุเหตุผล';

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.send(`❌ คำสั่งซื้อของคุณถูกยกเลิก เนื่องจาก: ${reason}`);
      }

      await interaction.followUp({
        content: `❌ แจ้งเหตุผลการยกเลิกไปยัง <@${userId}> เรียบร้อย`,
        ephemeral: true,
      });
      return;
    }
  } catch (err) {
    console.error('Error handling interaction:', err);
  }
});

client.login(process.env.TOKEN);
