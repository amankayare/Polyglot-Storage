// Usage: node scripts/generate_google_refresh_token.js
// This script will prompt you to visit a URL, authorize, and paste the code to get a refresh token.

const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config({ path: '.env' });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // For desktop apps
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPE,
  prompt: 'consent',
});

console.log('Authorize this app by visiting this url:\n', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oAuth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token', err);
      process.exit(1);
    }
    console.log('\nYour refresh token is:\n');
    console.log(token.refresh_token);
    console.log('\nPaste this value into your .env as GOOGLE_REFRESH_TOKEN.');
    process.exit(0);
  });
});
