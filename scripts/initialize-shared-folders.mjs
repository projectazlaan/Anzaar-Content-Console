import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const parentFolderId = "1Gn9_-uBbdNUNuYEBWJwafEVPcFAzwu3a";
const SCOPES = ["https://www.googleapis.com/auth/drive"];

async function run() {
  const client_email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const private_key = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!client_email || !private_key) {
    console.error("Missing service account email or private key in .env.local");
    process.exit(1);
  }

  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: SCOPES,
  });

  const drive = google.drive({ version: "v3", auth });

  console.log("Connected to Google Drive using Service Account.");
  console.log(`Parent Folder ID: ${parentFolderId}`);

  const foldersToCreate = ["Designs", "Shoots", "Edits"];
  const createdFolders = {};

  for (const folderName of foldersToCreate) {
    console.log(`Checking if folder '${folderName}' exists in parent...`);
    
    // Search
    const searchResponse = await drive.files.list({
      q: `name = '${folderName}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      const existingId = searchResponse.data.files[0].id;
      console.log(`Folder '${folderName}' already exists with ID: ${existingId}`);
      createdFolders[folderName] = existingId;
    } else {
      console.log(`Creating folder '${folderName}'...`);
      const folderMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      };

      const createResponse = await drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
        supportsAllDrives: true,
      });

      const newId = createResponse.data.id;
      console.log(`Created folder '${folderName}' with ID: ${newId}`);
      createdFolders[folderName] = newId;
    }
  }

  console.log("\nFolder creation complete!");
  console.log(createdFolders);

  // Update .env.local file contents
  const envPath = join(process.cwd(), ".env.local");
  let envContent = readFileSync(envPath, "utf8");

  // Replace folder IDs
  envContent = envContent.replace(
    /GOOGLE_DRIVE_DESIGNS_FOLDER_ID=.*/,
    `GOOGLE_DRIVE_DESIGNS_FOLDER_ID=${createdFolders["Designs"]}`
  );
  envContent = envContent.replace(
    /GOOGLE_DRIVE_SHOOTS_FOLDER_ID=.*/,
    `GOOGLE_DRIVE_SHOOTS_FOLDER_ID=${createdFolders["Shoots"]}`
  );
  envContent = envContent.replace(
    /GOOGLE_DRIVE_EDITS_FOLDER_ID=.*/,
    `GOOGLE_DRIVE_EDITS_FOLDER_ID=${createdFolders["Edits"]}`
  );

  // Comment out or remove OAuth2 variables to avoid confusion
  envContent = envContent.replace(
    /GOOGLE_DRIVE_CLIENT_ID=(.*)/,
    `# GOOGLE_DRIVE_CLIENT_ID=$1`
  );
  envContent = envContent.replace(
    /GOOGLE_DRIVE_CLIENT_SECRET=(.*)/,
    `# GOOGLE_DRIVE_CLIENT_SECRET=$1`
  );
  envContent = envContent.replace(
    /GOOGLE_DRIVE_REFRESH_TOKEN=(.*)/,
    `# GOOGLE_DRIVE_REFRESH_TOKEN=$1`
  );

  writeFileSync(envPath, envContent, "utf8");
  console.log("\nUpdated .env.local with new folder IDs and commented out old OAuth2 config.");
}

run().catch((err) => {
  console.error("Error running setup script:", err);
  process.exit(1);
});
