/**
 * Run this script to get a new Google Drive refresh token:
 *   node scripts/get-refresh-token.mjs
 */

import { createServer } from "http";
import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read env file
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^(?:#\\s*)?${key}=(.+)$`, "m"));
  return match ? match[1].replace(/^"|"$/g, "").trim() : null;
};

const CLIENT_ID = getEnv("GOOGLE_DRIVE_CLIENT_ID");
const CLIENT_SECRET = getEnv("GOOGLE_DRIVE_CLIENT_SECRET");
const REDIRECT_URI = "http://localhost:9999/oauth2callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ GOOGLE_DRIVE_CLIENT_ID or GOOGLE_DRIVE_CLIENT_SECRET not found in .env.local");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // Force to always get refresh_token
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\n🔗 Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n⏳ Waiting for callback on http://localhost:9999...\n");

// Start a temporary server to capture the callback
const server = createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth2callback")) {
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, "http://localhost:9999");
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No code found.");
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const newRefreshToken = tokens.refresh_token;

    if (!newRefreshToken) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>❌ No refresh token received. Try revoking app access and re-authorizing.</h2>");
      console.error("❌ No refresh token returned.");
      server.close();
      return;
    }

    // Update .env.local and uncomment keys
    let updatedEnv = envContent;
    updatedEnv = updatedEnv.replace(/^(?:#\s*)?GOOGLE_DRIVE_CLIENT_ID=(.+)$/m, 'GOOGLE_DRIVE_CLIENT_ID=$1');
    updatedEnv = updatedEnv.replace(/^(?:#\s*)?GOOGLE_DRIVE_CLIENT_SECRET=(.+)$/m, 'GOOGLE_DRIVE_CLIENT_SECRET=$1');
    
    if (updatedEnv.match(/^(?:#\s*)?GOOGLE_DRIVE_REFRESH_TOKEN=/m)) {
      updatedEnv = updatedEnv.replace(
        /^(?:#\s*)?GOOGLE_DRIVE_REFRESH_TOKEN=.+$/m,
        `GOOGLE_DRIVE_REFRESH_TOKEN=${newRefreshToken}`
      );
    } else {
      updatedEnv += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${newRefreshToken}`;
    }

    writeFileSync(envPath, updatedEnv, "utf8");

    console.log("✅ New refresh token obtained and saved to .env.local!");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${newRefreshToken}`);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:white;">
        <h2 style="color:#4ade80">✅ Success! Refresh token saved.</h2>
        <p>You can close this tab and restart the dev server.</p>
        <code style="background:#1e293b;padding:10px;display:block;margin-top:20px;border-radius:8px;word-break:break-all;">
          GOOGLE_DRIVE_REFRESH_TOKEN=${newRefreshToken}
        </code>
      </body></html>
    `);

    server.close();
    console.log("\n✅ Restart your dev server: npm run dev");
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.end("Error: " + err.message);
    server.close();
  }
});

server.listen(9999);
