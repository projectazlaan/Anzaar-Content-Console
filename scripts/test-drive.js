
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Mock simple dotenv loader
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }
        env[match[1]] = value.replace(/\\n/g, '\n');
    }
});

const SCOPES = ["https://www.googleapis.com/auth/drive"];

async function checkFolders(drive, mode) {
    const folders = [
        { name: "Designs", id: env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID },
        { name: "Shoots", id: env.GOOGLE_DRIVE_SHOOTS_FOLDER_ID },
        { name: "Edits", id: env.GOOGLE_DRIVE_EDITS_FOLDER_ID }
    ];

    for (const folder of folders) {
        console.log(`Checking folder: ${folder.name} (${folder.id}) [${mode}]`);
        try {
            const res = await drive.files.get({
                fileId: folder.id,
                fields: 'id, name, capabilities'
            });
            console.log(`✅ Success: Found folder "${res.data.name}"`);
            
            const listRes = await drive.files.list({
                q: `'${folder.id}' in parents and trashed = false`,
                pageSize: 1
            });
            console.log(`✅ Success: Read access confirmed`);
        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
        }
    }
}

async function testDrive() {
    console.log("--- Google Drive Configuration Test ---");
    console.log("Service Account:", env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL);
    console.log("User Email:", env.GOOGLE_DRIVE_USER_EMAIL);
    
    if (!env.GOOGLE_DRIVE_PRIVATE_KEY) {
        console.error("❌ Error: Private key not found in .env.local");
        return;
    }

    try {
        console.log("\n--- Testing Direct Service Account Access ---");
        const authDirect = new google.auth.JWT(
            env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            env.GOOGLE_DRIVE_PRIVATE_KEY,
            SCOPES
        );
        const driveDirect = google.drive({ version: "v3", auth: authDirect });
        await checkFolders(driveDirect, "Direct Access");

        console.log("\n--- Testing Impersonation Access ---");
        const authImp = new google.auth.JWT(
            env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            env.GOOGLE_DRIVE_PRIVATE_KEY,
            SCOPES,
            env.GOOGLE_DRIVE_USER_EMAIL
        );
        const driveImp = google.drive({ version: "v3", auth: authImp });
        await checkFolders(driveImp, "Impersonation");

    } catch (err) {
        console.error("❌ Critical Error:", err.message);
    }
}

testDrive();
