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
      // ไม่ใช้ deferUpdate() ที่นี่เพราะมันอาจทำให้ interaction หมดอายุเร็ว
      // เปลี่ยนเป็น reply แบบ ephemeral เงียบๆ เลือกสินค้าแล้วจบ
      pendingOrders.set(interaction.user.id, interaction.values[0]);
      await interaction.reply({
        content: '✅ คุณเลือกสินค้าเรียบร้อยแล้ว',
        flags: EPHEMERAL_FLAG,
      });

    } else if (interaction.isButton()) {
      if (interaction.customId === 'confirm_order') {
        const user = interaction.user;
        const guild = interaction.guild;

        await interaction.deferReply({ flags: EPHEMERAL_FLAG });

        const product = pendingOrders.get(user.id);
        if (!product) {
          return await interaction.editReply({
            embeds: [
              new EmbedBuilder().setColor('Red').setDescription('❌ กรุณาเลือกสินค้าก่อนนะคะ'),
            ],
          });
        }

        // สร้าง role ใหม่สำหรับ user
        const role = await guild.roles.create({
          name: `🛍️-${user.username}`,
          permissions: [PermissionsBitField.Flags.ViewChannel],
          reason: 'สร้างสำหรับคำสั่งซื้อ',
        });

        // สร้าง channel ใหม่ใน category
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

        // ใส่ role ให้ user
        await guild.members.cache.get(user.id)?.roles.add(role);

        // แจ้ง user ว่าสร้างห้องเสร็จแล้ว
        await interaction.editReply({
          content: `✅ สร้างห้อง <#${channel.id}> เรียบร้อยแล้ว`,
        });

        // ส่ง embed รายละเอียดสินค้าในห้อง
        const productEmbed = new EmbedBuilder()
          .setTitle(`🧾 สั่งซื้อ: ${product.toUpperCase()}`)
          .setDescription(`💰 ราคา: **${priceMap[product]} บาท**\n📌 โปรดสแกน QR ด้านล่าง แล้วแนบสลิปในห้องนี้ได้เลยค่ะ`)
          .setImage('https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg')
          .setColor(0x00ff00);

        await channel.send({ content: `<@${user.id}>`, embeds: [productEmbed] });

        // รอรับสลิปหลักฐานจาก user (รูปภาพ)
        const filter = (m) =>
          m.author.id === user.id &&
          m.attachments.size > 0 &&
          m.attachments.first().contentType?.startsWith('image/');

        try {
          const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 300000, // 5 นาที
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
            // ลบ role และลบ channel หลังจากแจ้ง timeout แล้ว 5 วินาที
            const roleToRemove = guild.roles.cache.find((r) => r.name === `🛍️-${user.username}`);
            if (roleToRemove) await guild.members.cache.get(user.id)?.roles.remove(roleToRemove);
            await channel.delete();
          }, 5000);
        }
      } else {
        // Handle approve / reject buttons
        const [action, , userId] = interaction.customId.split('_');
        const guild = interaction.guild;
        if (action === 'approve') {
          const member = await guild.members.fetch(userId);
          const orderChannel = guild.channels.cache.find(
            (ch) => ch.name === `📁-order-${userId}`
          );

          await interaction.deferUpdate();

          const authClient = await auth.getClient();
          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A2:B',
          });

          const rows = res.data.values || [];
          const available = rows.find((row) => !row[1]);
          if (!available) {
            return interaction.followUp({
              embeds: [
                new EmbedBuilder().setColor('Red').setDescription('❌ ไม่พบคีย์ว่าง'),
              ],
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

          if (orderChannel) {
            const embed = new EmbedBuilder()
              .setTitle('✅ อนุมัติคำสั่งซื้อ')
              .setDescription(
                `<@${userId}> คำสั่งซื้อของคุณได้รับการอนุมัติแล้วค่ะ\n🔑 คีย์ใช้งาน : \`${key}\`\n📌 จะปิดห้องใน 5 นาที กรุณาจดจำคีย์ไว้ให้ดี หากทำหาย ticket มาได้ครับ`
              )
              .setColor('Green');

            await orderChannel.send({ embeds: [embed] });

            setTimeout(async () => {
              const roleToRemove = member.roles.cache.find((r) => r.name.startsWith('🛍️-'));
              if (roleToRemove) await member.roles.remove(roleToRemove);
              await orderChannel.delete();
            }, 5 * 60 * 1000);
          }
        } else if (action === 'reject') {
          await interaction.deferUpdate();

          await interaction.followUp({
            content: 'ใส่เหตุผลที่ยกเลิก',
            flags: EPHEMERAL_FLAG,
          });

          const filter = (m) => m.author.id === interaction.user.id;
          const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
          const collected = await adminChannel.awaitMessages({
            filter,
            max: 1,
            time: 120000,
          }).catch(() => {});

          const reason = collected?.first()?.content || 'ไม่ระบุเหตุผล';
          const member = await guild.members.fetch(userId);
          const orderChannel = guild.channels.cache.find((ch) => ch.name === `📁-order-${userId}`);

          if (orderChannel) {
            await orderChannel.send({
              content: `❌ คำสั่งซื้อของคุณถูกยกเลิกด้วยเหตุผล : ${reason}`,
            });

            setTimeout(async () => {
              const roleToRemove = member.roles.cache.find((r) => r.name.startsWith('🛍️-'));
              if (roleToRemove) await member.roles.remove(roleToRemove);
              await orderChannel.delete();
            }, 2 * 60 * 1000);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error handling interaction:', err);
  }
});

client.login(process.env.TOKEN);
