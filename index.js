const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('โนอาออนไลน์แล้วจ้าาาา 🚀');
});

app.listen(3000, () => {
  console.log('Express server is running!');
});

require('./bot.js'); // โหลดบอท
