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
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: './noar-sserver-8bdb34c58600.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets('v4');

// ==== CONFIG ====
const SPREADSHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';
const SHEET_NAME = 'keys!A:B'; // A=key, B=used_by

const ADMIN_CHANNEL_ID = '1385951413229850634';
const CATEGORY_ID = '1385950753763623062';

const priceMap = {
  boostfps: 129,
  network: 149,
  memory: 99,
  dll: 179,
  all: 249,
};
const pendingOrders = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', () => {
  console.log(`✅ บอทออนไลน์แล้ว: ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!shop') {
    const embed = new EmbedBuilder()
      .setTitle('🛍️ BlackPulse Shop')
      .setDescription('เลือกสินค้าที่ต้องการ แล้วกด "🛒 สั่งซื้อเลย"')
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

    const rowSelect = new ActionRowBuilder().addComponents(select);
    const rowButton = new ActionRowBuilder().addComponents(button);

    await msg.channel.send({ embeds: [embed], components: [rowSelect, rowButton] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_product') {
    pendingOrders.set(interaction.user.id, interaction.values[0]);
    await interaction.deferUpdate();
  }

  if (interaction.isButton()) {
    const [action, uid, cid] = interaction.customId.split('_');

    // 📥 หลัง admin กด “อนุมัติ” หรือ “ยกเลิก”
    if (['approve', 'reject'].includes(action)) {
      const guild = interaction.guild;
      const member = await guild.members.fetch(uid);
      const channel = guild.channels.cache.get(cid);

      if (action === 'approve') {
        const clientSheets = await auth.getClient();
        const res = await sheets.spreadsheets.values.get({
          auth: clientSheets,
          spreadsheetId: SPREADSHEET_ID,
          range: SHEET_NAME,
        });

        const rows = res.data.values;
        const available = rows.find((r) => !r[1]);
        const rowIndex = rows.indexOf(available) + 1;

        if (!available) return interaction.reply({ content: '❌ ไม่มีคีย์เหลือใน Google Sheet!', ephemeral: true });

        const key = available[0];
        await sheets.spreadsheets.values.update({
          auth: clientSheets,
          spreadsheetId: SPREADSHEET_ID,
          range: `keys!B${rowIndex}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[uid]] },
        });

        await channel.send(`✅ คำสั่งซื้อของคุณได้รับการอนุมัติแล้ว!\n🔑 Key: \`${key}\``);
        const role = guild.roles.cache.find((r) => r.name === `🛍️-${member.user.username}`);
        if (role) await member.roles.remove(role);
        await channel.delete();
        await interaction.message.delete().catch(() => {});
        await interaction.reply({ content: '✅ อนุมัติคำสั่งซื้อแล้ว', ephemeral: true });
      }

      if (action === 'reject') {
        await channel.send('❌ คำสั่งซื้อของคุณถูกยกเลิก โปรดติดต่อแอดมินหากมีปัญหา');
        await interaction.reply({ content: '🚫 ยกเลิกคำสั่งซื้อแล้ว รอ 2 นาทีเพื่อปิดห้อง', ephemeral: true });
        const role = guild.roles.cache.find((r) => r.name === `🛍️-${member.user.username}`);
        setTimeout(async () => {
          if (role) await member.roles.remove(role);
          if (channel) await channel.delete();
        }, 120000);
        await interaction.message.delete().catch(() => {});
      }
    }

    // ลูกค้ากดปุ่มสั่งซื้อ
    if (interaction.customId === 'confirm_order') {
      const user = interaction.user;
      const guild = interaction.guild;
      const product = pendingOrders.get(user.id);

      if (!product) {
        await interaction.reply({ content: '❌ กรุณาเลือกสินค้าก่อนนะคะ', ephemeral: true });
        return;
      }

      const price = priceMap[product];
      const role = await guild.roles.create({
        name: `🛍️-${user.username}`,
        permissions: [PermissionsBitField.Flags.ViewChannel],
      });

      const channel = await guild.channels.create({
        name: `-order-${user.username.toLowerCase()}`,
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
        .setDescription(`💰 ราคา: **${price} บาท**\n📌 แนบสลิปในห้องนี้ได้เลยค่ะ`)
        .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
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
          content: `📥 ออเดอร์จาก <@${user.id}> - ${product.toUpperCase()} - ${price} บาท\nห้อง: <#${channel.id}>`,
          files: [slip],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`approve_${user.id}_${channel.id}`)
                .setLabel('✅ อนุมัติ')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`reject_${user.id}_${channel.id}`)
                .setLabel('❌ ยกเลิก')
                .setStyle(ButtonStyle.Danger)
            ),
          ],
        });

        await message.reply('✅ ส่งหลักฐานเรียบร้อยแล้วค่ะ รอแอดมินตรวจสอบน้า~');
      } catch (err) {
        await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่`');
      }
    }
  }
});

client.login(process.env.TOKEN);
