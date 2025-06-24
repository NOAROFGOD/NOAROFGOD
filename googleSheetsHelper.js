// googleSheetsHelper.js
const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(__dirname, 'noar-sserver-9c0924c3819f.json');
const SPREADSHEET_ID = '11bjYLOsXatoJhvyza6ikuvmbXW2IehaBqaHoO5meuYw';

let sheetsClient;

async function authorize() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

async function getAvailableKey(product) {
  const sheets = await authorize();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:D',
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return null;

  for (let i = 0; i < rows.length; i++) {
    const [prod, key, usedBy] = rows[i];
    if (prod === product && (!usedBy || usedBy.trim() === '')) {
      return { key, rowIndex: i + 2 };
    }
  }
  return null;
}

async function markKeyUsed(rowIndex, userId) {
  const sheets = await authorize();
  const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Sheet1!C${rowIndex}:D${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[userId, now]],
    },
  });
}

module.exports = { getAvailableKey, markKeyUsed };
