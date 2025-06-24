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
  partials: [Partials.Channel]
});

const ADMIN_CHANNEL_ID = '1386017253467619540';
const CATEGORY_ID = '1385950753763623062';
const DONATOR_ROLE_ID = '1386018737005658273';
const SHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';

const auth = new google.auth.GoogleAuth({
  keyFile: 'noar-sserver-9c0924c3819f.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const pendingOrders = new Map();
const priceMap = { BetterFiveM: 49 };
const EPHEMERAL_FLAG = 1 << 6;

client.once('ready', () => console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`));

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
      .addOptions(Object.keys(priceMap).map((key) => ({
        label: key.toUpperCase(),
        value: key,
        description: `${priceMap[key]} บาท`
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
      ]
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      return;
    }

    if (!interaction.isButton()) return;

    const guild = interaction.guild;
    const parts = interaction.customId.split('_');

    if (interaction.customId === 'confirm_order') {
      const user = interaction.user;
      await interaction.deferReply({ flags: EPHEMERAL_FLAG });

      const product = pendingOrders.get(user.id);
      if (!product) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ กรุณาเลือกสินค้าก่อนนะคะ')]
        });
      }

      const role = await guild.roles.create({
        name: `🛍️-${user.id}`,
        permissions: [PermissionsBitField.Flags.ViewChannel],
        reason: 'สร้างสำหรับคำสั่งซื้อ'
      });

      const channel = await guild.channels.create({
        name: `📁-order-${user.id}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.ReadMessageHistory] }
        ]
      });

      const member = await guild.members.fetch(user.id);
      await member.roles.add(role);

      await interaction.editReply({ content: `✅ สร้างห้อง <#${channel.id}> เรียบร้อยแล้ว` });

      const productEmbed = new EmbedBuilder()
        .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
        .setDescription(`💰 ราคา: **${priceMap[product]} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้ได้เลยค่ะ`)
        .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
        .setColor(0x00ff00);

      await channel.send({ content: `<@${user.id}>`, embeds: [productEmbed] });

      const filter = (m) => m.author.id === user.id && m.attachments.size > 0 && m.attachments.first().contentType?.startsWith('image/');

      try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
        const message = collected.first();
        const slip = message.attachments.first();

        await message.reply('✅ ส่งหลักฐานให้แอดมินแล้ว รอแอดตรวจสอบนะคะ');

        const approveButton = new ButtonBuilder()
          .setCustomId(`approve_order_${user.id}`)
          .setLabel('✅ อนุมัติ')
          .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
          .setCustomId(`reject_order_${user.id}`)
          .setLabel('❌ ยกเลิก')
          .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(approveButton, rejectButton);

        const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID).catch(() => null);
        if (!adminChannel) return;

        await adminChannel.send({
          content: `📥 ออเดอร์จาก <@${user.id}>\n📦 สินค้า: **${product.toUpperCase()}**\n💸 ราคา: **${priceMap[product]} บาท**\n🗂️ ห้อง: <#${channel.id}>`,
          files: [slip],
          components: [actionRow],
        });
      } catch {
        await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่');
        setTimeout(async () => {
          const roleToRemove = guild.roles.cache.find((r) => r.name === `🛍️-${user.id}`);
          if (roleToRemove) await member.roles.remove(roleToRemove);
          const ch = await guild.channels.fetch(channel.id).catch(() => null);
          if (ch) await ch.delete();
        }, 5000);
      }
    }

    if (parts[0] === 'approve') {
      await interaction.deferUpdate();
      const userId = parts[2];

      let member;
      try {
        member = await guild.members.fetch(userId);
      } catch {
        return interaction.followUp({ content: '⚠️ ไม่พบสมาชิกนี้แล้ว', flags: EPHEMERAL_FLAG });
      }

      const orderChannel = guild.channels.cache.find(ch => ch.name === `📁-order-${userId}`);
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Sheet1!A2:B' });

      const rows = res.data.values || [];
      const available = rows.find((row) => !row[1]);
      if (!available) {
        return interaction.followUp({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ ไม่พบคีย์ว่าง')], flags: EPHEMERAL_FLAG });
      }

      const key = available[0];
      const rowIndex = rows.findIndex((r) => r[0] === key) + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Sheet1!B${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[`ใช้โดย ${member.user.tag}`]] }
      });

      await member.roles.add(DONATOR_ROLE_ID);
      if (orderChannel) {
        const embed = new EmbedBuilder()
          .setTitle('✅ อนุมัติคำสั่งซื้อ')
          .setDescription(`<@${userId}> คำสั่งซื้อของคุณได้รับการอนุมัติแล้วค่ะ\n🔑 คีย์ใช้งาน : \`${key}\`\n📌 จะปิดห้องใน 5 นาที กรุณาจดจำคีย์ไว้ให้ดี หากทำหาย ticket มาได้ครับ`)
          .setColor('Green');

        await orderChannel.send({ embeds: [embed] });

        setTimeout(async () => {
          try {
            const roleToRemove = member.roles.cache.find((r) => r.name.startsWith('🛍️-'));
            if (roleToRemove) await member.roles.remove(roleToRemove);
            const ch = await guild.channels.fetch(orderChannel.id).catch(() => null);
            if (ch) await ch.delete();
          } catch (e) { console.error(e); }
        }, 5 * 60 * 1000);
      }
    }
  } catch (err) {
    console.error('Error handling interaction:', err);
  }
});

client.login(process.env.TOKEN);
