/**
 * setup-drive-permissions.mjs
 * 
 * Run once to grant the Service Account editor access to all Drive folders.
 * Usage: node scripts/setup-drive-permissions.mjs
 *
 * Requires .env.local to be present with:
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_DRIVE_PRIVATE_KEY
 *   GOOGLE_DRIVE_CLIENT_ID + CLIENT_SECRET + REFRESH_TOKEN (OAuth2 as owner)
 *   GOOGLE_DRIVE_DESIGNS_FOLDER_ID
 *   GOOGLE_DRIVE_SHOOTS_FOLDER_ID
 *   GOOGLE_DRIVE_EDITS_FOLDER_ID
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- Load .env.local ----------
const envPath = join(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  env[key] = val;
}

const SERVICE_ACCOUNT_EMAIL = env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
const FOLDER_IDS = {
  Designs: env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID,
  Shoots:  env.GOOGLE_DRIVE_SHOOTS_FOLDER_ID,
  Edits:   env.GOOGLE_DRIVE_EDITS_FOLDER_ID,
};

if (!SERVICE_ACCOUNT_EMAIL) {
  console.error("❌ GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL not found in .env.local");
  process.exit(1);
}
if (!FOLDER_IDS.Designs || !FOLDER_IDS.Shoots || !FOLDER_IDS.Edits) {
  console.error("❌ One or more folder IDs missing in .env.local");
  process.exit(1);
}

// ---------- Build OAuth2 client (owner's credentials) ----------
async function getOwnerDriveClient() {
  // Try OAuth2 first
  const client_id     = env.GOOGLE_DRIVE_CLIENT_ID;
  const client_secret = env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refresh_token = env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (client_id && client_secret && refresh_token) {
    const oauth2 = new google.auth.OAuth2(client_id, client_secret, "http://localhost");
    oauth2.setCredentials({ refresh_token });
    console.log("🔑 Using OAuth2 (owner) to grant permissions");
    return google.drive({ version: "v3", auth: oauth2 });
  }

  // Fallback: Service Account (if it already has access, it can share)
  const rawKey = env.GOOGLE_DRIVE_PRIVATE_KEY;
  if (SERVICE_ACCOUNT_EMAIL && rawKey) {
    const privateKey = rawKey.replace(/\\n/g, "\n").replace(/^"|"$/g, "");
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: SERVICE_ACCOUNT_EMAIL, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    console.log("🔑 Using Service Account to grant permissions");
    return google.drive({ version: "v3", auth });
  }

  throw new Error("No valid Google credentials found in .env.local");
}

// ---------- Grant editor permission ----------
async function grantEditorAccess(drive, folderId, folderName) {
  console.log(`\n📁 Processing folder: ${folderName} (${folderId})`);

  // Check existing permissions
  try {
    const perms = await drive.permissions.list({
      fileId: folderId,
      fields: "permissions(id,emailAddress,role)",
      supportsAllDrives: true,
    });

    const existing = (perms.data.permissions || []).find(
      (p) => p.emailAddress?.toLowerCase() === SERVICE_ACCOUNT_EMAIL.toLowerCase()
    );

    if (existing) {
      if (existing.role === "writer" || existing.role === "owner") {
        console.log(`  ✅ Service account already has '${existing.role}' access — skipping`);
        return;
      }
      // Update existing permission
      await drive.permissions.update({
        fileId: folderId,
        permissionId: existing.id,
        requestBody: { role: "writer" },
        supportsAllDrives: true,
      });
      console.log(`  ✅ Updated service account permission to 'writer'`);
      return;
    }
  } catch (e) {
    console.log(`  ⚠️  Could not list permissions (${e.message}), trying to create...`);
  }

  // Create new permission
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: SERVICE_ACCOUNT_EMAIL,
    },
    sendNotificationEmail: false,
    supportsAllDrives: true,
  });
  console.log(`  ✅ Granted 'writer' (editor) access to service account`);
}

// ---------- Main ----------
async function main() {
  console.log("=================================================");
  console.log("  Anzaar Drive Permission Setup");
  console.log("=================================================");
  console.log(`Service Account: ${SERVICE_ACCOUNT_EMAIL}`);
  console.log("");

  const drive = await getOwnerDriveClient();

  let allOk = true;
  for (const [name, id] of Object.entries(FOLDER_IDS)) {
    try {
      await grantEditorAccess(drive, id, name);
    } catch (err) {
      console.error(`  ❌ Failed for ${name}: ${err.message}`);
      allOk = false;
    }
  }

  console.log("\n=================================================");
  if (allOk) {
    console.log("✅ All folders set up! Upload & download should now work from any device.");
  } else {
    console.log("⚠️  Some folders failed. Check errors above.");
    console.log("   Make sure the folder owner has shared them manually if needed.");
  }
  console.log("=================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
