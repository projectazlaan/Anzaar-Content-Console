const { google } = require('googleapis');
const readline = require('readline');

/**
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. APIs & Services > Credentials
 * 3. Create Credentials > OAuth client ID
 * 4. Application type: Desktop app
 * 5. Run this script: node scripts/get-refresh-token.js <CLIENT_ID> <CLIENT_SECRET>
 */

const args = process.argv.slice(2);
const CLIENT_ID = args[0];
const CLIENT_SECRET = args[1];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Usage: node scripts/get-refresh-token.js <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // For desktop apps
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('1. Open this URL in your browser:');
console.log('\x1b[36m%s\x1b[0m', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('2. Enter the code from that page here: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n\x1b[32mSUCCESS!\x1b[0m Add these to your .env.local:');
    console.log('-------------------------------------------');
    console.log(`GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('-------------------------------------------');
  } catch (error) {
    console.error('Error retrieving access token:', error.message);
  } finally {
    rl.close();
  }
});
