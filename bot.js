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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
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
const priceMap = {
  BetterFiveM: 49,
};

const EPHEMERAL_FLAG = 1 << 6; // 64

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
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== 'select_product') return;
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.deferUpdate();
    } else if (interaction.isButton()) {
      const [action, , userId] = interaction.customId.split('_');
      if (interaction.customId === 'confirm_order') {
        const user = interaction.user;
        const guild = interaction.guild;
        const product = pendingOrders.get(user.id);
        if (!product) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder().setColor('Red').setDescription('❌ กรุณาเลือกสินค้าก่อนนะคะ'),
            ],
            flags: EPHEMERAL_FLAG,
          });
        }

        await interaction.deferReply({ flags: EPHEMERAL_FLAG });

        const role = await guild.roles.create({
          name: `🛍️-${user.username}`,
          permissions: [PermissionsBitField.Flags.ViewChannel],
          reason: 'สร้างสำหรับคำสั่งซื้อ',
        });

        const channel = await guild.channels.create({
          name: `📁-order-${user.id}`,
          type: ChannelType.GuildText,
          parent: CATEGORY_ID,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            {
              id: role.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
            {
              id: client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ReadMessageHistory,
              ],
            },
          ],
          reason: 'ห้องสำหรับคำสั่งซื้อ',
        });

        await guild.members.cache.get(user.id)?.roles.add(role);

        await interaction.editReply({
          content: `✅ สร้างห้อง <#${channel.id}> เรียบร้อยแล้ว`,
        });

        // ส่ง embed ทันทีเพื่อความเร็ว ไม่รอ awaitMessages
        const productEmbed = new EmbedBuilder()
          .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
          .setDescription(`💰 ราคา: **${priceMap[product]} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้ได้เลยค่ะ`)
          .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
          .setColor(0x00ff00);

        await channel.send({ content: `<@${user.id}>`, embeds: [productEmbed] });

        // รอการส่งสลิป
        const filter = (m) =>
          m.author.id === user.id &&
          m.attachments.size > 0 &&
          m.attachments.first().contentType?.startsWith('image/');

        try {
          const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 300000,
            errors: ['time'],
          });

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

          const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
          await adminChannel.send({
            content: `📥 ออเดอร์จาก <@${user.id}>\n📦 สินค้า: **${product.toUpperCase()}**\n💸 ราคา: **${priceMap[product]} บาท**\n🗂️ ห้อง: <#${channel.id}>`,
            files: [slip],
            components: [actionRow],
          });
        } catch {
          await channel.send('⏰ ไม่ได้รับหลักฐานใน 5 นาที กรุณาสั่งซื้อใหม่');
          setTimeout(async () => {
            const roleToRemove = guild.roles.cache.find((r) => r.name === `🛍️-${user.username}`);
            if (roleToRemove) await guild.members.cache.get(user.id)?.roles.remove(roleToRemove);
            await channel.delete();
          }, 5000);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.TOKEN);
