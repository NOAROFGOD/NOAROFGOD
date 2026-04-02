const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  InteractionType
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('clientReady', () => {
  console.log(`ออนไลน์: ${client.user.tag}`);
});


// =======================
// 🧩 STEP 1: เมนูหลัก
// =======================
client.on('messageCreate', async (msg) => {
  if (msg.content === '!menu') {

    const embed = new EmbedBuilder()
      .setTitle('⚔️ Albion Profit Finder')
      .setDescription('กดปุ่มด้านล่างเพื่อเริ่มหาของกำไร')
      .setColor(0x00ccff)
      .setImage('https://media.discordapp.net/attachments/1488872063065133197/1489350863238725793/6kp5Ici.png?ex=69d01994&is=69cec814&hm=8dc90fe2edae698ea4d8f0ed6a660bff5e79b953be1f54ba6ff2d1c264c13682&=&format=webp&quality=lossless')
      .setFooter({ text: 'ระบบวิเคราะห์กำไรอัตโนมัติ' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_menu')
        .setLabel('🔍 เริ่มค้นหากำไร')
        .setStyle(ButtonStyle.Primary)
    );

    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});


// =======================
// 🧩 STEP 2: กดปุ่ม → เปิด Modal
// =======================
client.on('interactionCreate', async (interaction) => {

  if (interaction.isButton() && interaction.customId === 'open_menu') {

    const modal = new ModalBuilder()
      .setCustomId('profit_modal')
      .setTitle('ตั้งค่าการค้นหา');

    // server
    const serverInput = new TextInputBuilder()
      .setCustomId('server')
      .setLabel('Server (west / east)')
      .setStyle(TextInputStyle.Short);

    // focus
    const focusInput = new TextInputBuilder()
      .setCustomId('focus')
      .setLabel('มี focus ไหม (yes / no)')
      .setStyle(TextInputStyle.Short);

    // category
    const categoryInput = new TextInputBuilder()
      .setCustomId('category')
      .setLabel('หมวด (1=gear, 2=food, 3=resource)')
      .setStyle(TextInputStyle.Short);

    modal.addComponents(
      new ActionRowBuilder().addComponents(serverInput),
      new ActionRowBuilder().addComponents(focusInput),
      new ActionRowBuilder().addComponents(categoryInput)
    );

    await interaction.showModal(modal);
  }


  // =======================
  // 🧩 STEP 3: รับข้อมูลจาก Modal
  // =======================
  if (interaction.type === InteractionType.ModalSubmit) {

    if (interaction.customId === 'profit_modal') {

      const server = interaction.fields.getTextInputValue('server');
      const focus = interaction.fields.getTextInputValue('focus');
      const category = interaction.fields.getTextInputValue('category');

      // =======================
      // 🧠 MOCK AI (เดี๋ยวเราต่อ API จริงทีหลัง)
      // =======================
      const results = [
        {
          name: "T4 Bag",
          craft: 1200,
          sell: 1900,
          profit: 700,
          cityBuy: "Bridgewatch",
          citySell: "Caerleon"
        },
        {
          name: "T5 Sword",
          craft: 8000,
          sell: 11000,
          profit: 3000,
          cityBuy: "Martlock",
          citySell: "Fort Sterling"
        }
      ];

      const embed = new EmbedBuilder()
        .setTitle('📈 ผลวิเคราะห์กำไร (Top 5)')
        .setColor(0x00ff99)
        .setDescription(`Server: ${server} | Focus: ${focus} | หมวด: ${category}`);

      results.forEach((item, i) => {
        embed.addFields({
          name: `#${i + 1} ${item.name}`,
          value:
`💰 ราคาขาย: ${item.sell}
🛠️ ค่าคราฟ: ${item.craft}
📊 กำไร: +${item.profit}

📍 ซื้อวัตถุดิบ: ${item.cityBuy}
🏭 คราฟ: ${item.cityBuy}
🏪 ขาย: ${item.citySell}`,
          inline: false
        });
      });

      // 🔥 สำคัญ: เห็นแค่คนกด
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }
  }

});

client.login(process.env.TOKEN);
