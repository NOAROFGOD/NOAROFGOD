require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./noar-sserver-9c0924c3819f.json'); // 👈 ไฟล์ JSON จาก Google

// ======= ค่าคงที่ =======
const PREFIX = '!';
const TOKEN = process.env.TOKEN;

// แก้ตรงนี้ตามของโนอา 👇
const QR_IMAGE = 'https://cdn.discordapp.com/attachments/1384470774668197998/1385979608083595335/IMG_7844.jpg?ex=685bfe18&is=685aac98&hm=d1694cf36c2937e636ddc1ab09533d3b424e0cb9197a7280afdc901877bef0dd&';
const ADMIN_CHANNEL_ID = '1386017253467619540';
const ROLE_ID = '1386018737005658273';
const SPREADSHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';

// ======= Google Sheet =======
const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
async function accessSheet() {
  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key,
  });
  await doc.loadInfo();
}

// ======= Discord Client =======
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`✅ บอทพร้อมใช้งาน: ${client.user.tag}`);
});

// ======= !shop คำสั่งเปิดร้าน =======
client.on('messageCreate', async (msg) => {
  if (!msg.content.startsWith(PREFIX) || msg.author.bot) return;
  const command = msg.content.slice(PREFIX.length).trim().toLowerCase();
  if (command !== 'shop') return;

  const embed = new EmbedBuilder()
    .setTitle('🛍️ ร้านค้าโนอา')
    .setDescription('เลือกสินค้าจากเมนู แล้วกดปุ่ม 📦 เพื่อสั่งซื้อ')
    .setColor(0x00ae86);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_product')
    .setPlaceholder('เลือกสินค้าที่ต้องการ')
    .addOptions([
      { label: '🎁 Nitro 1 เดือน', value: 'nitro1' },
      { label: '🎮 เกม Steam', value: 'steamgame' }
    ]);

  const orderBtn = new ButtonBuilder()
    .setCustomId('buy_button')
    .setLabel('📦 สั่งซื้อ')
    .setStyle(ButtonStyle.Primary);

  await msg.channel.send({
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(selectMenu),
      new ActionRowBuilder().addComponents(orderBtn)
    ]
  });
});

// ======= Interactions =======
client.on('interactionCreate', async (interaction) => {
  // 1. เลือกสินค้า
  if (interaction.isStringSelectMenu()) {
    return interaction.reply({ content: `✅ คุณเลือก: **${interaction.values[0]}**`, ephemeral: true });
  }

  // 2. ลูกค้ากดปุ่ม "สั่งซื้อ" → โชว์ QR
  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id === 'buy_button') {
      const embed = new EmbedBuilder()
        .setTitle('🔔 กรุณาชำระเงิน')
        .setDescription('สแกน QR ด้านล่าง แล้วกด "แจ้งชำระเงินสำเร็จ"')
        .setImage(QR_IMAGE);

      const confirmBtn = new ButtonBuilder()
        .setCustomId('confirm_pay')
        .setLabel('⚡ แจ้งชำระเงินสำเร็จ')
        .setStyle(ButtonStyle.Success);

      return interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(confirmBtn)],
        ephemeral: true
      });
    }

    // 3. ลูกค้ากด "แจ้งชำระ" → แจ้งแอดมิน
    if (id === 'confirm_pay') {
      const adminChan = await client.channels.fetch(ADMIN_CHANNEL_ID);
      const embed = new EmbedBuilder()
        .setTitle('💰 แจ้งชำระเงินใหม่')
        .setDescription(`จาก: ${interaction.user.tag} (${interaction.user.id})`);

      const confirm = new ButtonBuilder()
        .setCustomId(`admin_confirm_${interaction.user.id}`)
        .setLabel('✅ ยืนยัน')
        .setStyle(ButtonStyle.Success);

      const cancel = new ButtonBuilder()
        .setCustomId(`admin_cancel_${interaction.user.id}`)
        .setLabel('❌ ยกเลิก')
        .setStyle(ButtonStyle.Danger);

      await adminChan.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(confirm, cancel)]
      });

      return interaction.reply({ content: '📤 แจ้งชำระแล้ว รอแอดมินตรวจสอบจ้า', ephemeral: true });
    }

    // 4. แอดมินกด "ยกเลิก" หรือ "ยืนยัน"
    if (id.startsWith('admin_cancel_') || id.startsWith('admin_confirm_')) {
      const action = id.includes('cancel') ? 'cancel' : 'confirm';
      const userId = id.split('_')[2];
      const user = await client.users.fetch(userId);

      if (action === 'cancel') {
        await interaction.reply({ content: '📝 พิมพ์เหตุผลในการยกเลิกภายใน 1 นาที', ephemeral: true });
        const collected = await interaction.channel.awaitMessages({
          filter: m => m.author.id === interaction.user.id,
          max: 1,
          time: 60000
        });

        const reason = collected.first()?.content || 'ไม่ระบุเหตุผล';
        await user.send(`❌ คำสั่งซื้อของคุณถูกยกเลิก: ${reason}`);
        return interaction.editReply({ content: `❌ ยกเลิกสำเร็จ`, components: [] });
      }

      if (action === 'confirm') {
        await accessSheet();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        const row = rows.find(r => !r.used);

        if (!row) {
          await user.send('❗ ขอโทษค่ะ คีย์สินค้าหมดแล้ว 😢');
          return interaction.reply({ content: '❗ ไม่มีคีย์เหลือในชีต', ephemeral: true });
        }

        const key = row.key;
        row.used = true;
        await row.save();

        await user.send(`✅ ยืนยันแล้ว! คีย์ของคุณ:\n\`${key}\``);

        const guild = interaction.guild;
        const member = guild.members.cache.get(userId);
        if (member) await member.roles.add(ROLE_ID).catch(console.error);

        return interaction.reply({ content: '✅ ส่งคีย์เรียบร้อย', ephemeral: true });
      }
    }
  }
});

// ======= เปิดใช้งาน =======
client.login(TOKEN);
