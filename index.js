const express = require('express');
const line = require('@line/bot-sdk');
const admin = require('firebase-admin');

const app = express();

// ===== LINE =====
const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET
};
const client = new line.Client(config);

// ===== FIREBASE =====
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// 👇 แก้ปัญหา private key พัง
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// ===== WEBHOOK =====
app.post('/webhook', line.middleware(config), async (req, res) => {
  await Promise.all(req.body.events.map(handleEvent));
  res.sendStatus(200);
});

async function handleEvent(event) {
  const userId = event.source.userId;

  // ตอนแอด
  if (event.type === 'follow') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ใส่ KEY มาเลย'
    });
  }

  if (event.type !== 'message') return;

  const text = event.message.text.trim();

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  // ยังไม่ปลดล็อก = ตีว่าเป็น KEY
  if (!userDoc.exists || !userDoc.data().active) {
    const keyRef = db.collection('keys').doc(text);
    const keyDoc = await keyRef.get();

    if (!keyDoc.exists) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'KEY ผิด'
      });
    }

    if (keyDoc.data().used) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'KEY ใช้แล้ว'
      });
    }

    await keyRef.update({ used: true });
    await userRef.set({ active: true });

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ปลดล็อกแล้ว พิมพ์ signal'
    });
  }

  // ใช้งานได้แล้ว
  if (text === 'signal') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '📊 GOLD SIGNAL ...'
    });
  }
}

app.listen(process.env.PORT || 3000);
