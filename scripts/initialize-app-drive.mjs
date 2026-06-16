import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

async function run() {
  const envPath = join(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf8");

  const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^(?:#\\s*)?${key}=(.+)$`, "m"));
    return match ? match[1].replace(/^"|"$/g, "").trim() : null;
  };

  const client_id = getEnv("GOOGLE_DRIVE_CLIENT_ID");
  const client_secret = getEnv("GOOGLE_DRIVE_CLIENT_SECRET");
  const refresh_token = getEnv("GOOGLE_DRIVE_REFRESH_TOKEN");

  if (!client_id || !client_secret || !refresh_token) {
    console.error("Missing OAuth2 variables in .env.local");
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "http://localhost");
  oauth2Client.setCredentials({ refresh_token });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  console.log("Connected to Google Drive using App-Specific OAuth2 Client.");

  // Create root folder
  console.log("Creating root folder 'Anzaar Content Console Root'...");
  const rootMetadata = {
    name: "Anzaar Content Console Root",
    mimeType: "application/vnd.google-apps.folder",
  };
  
  const rootResponse = await drive.files.create({
    requestBody: rootMetadata,
    fields: "id",
  });
  
  const rootId = rootResponse.data.id;
  console.log(`Created root folder with ID: ${rootId}`);

  const foldersToCreate = ["Designs", "Shoots", "Edits"];
  const createdFolders = {};

  for (const folderName of foldersToCreate) {
    console.log(`Creating subfolder '${folderName}' inside root...`);
    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootId],
    };

    const createResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id",
    });

    const newId = createResponse.data.id;
    console.log(`Created folder '${folderName}' with ID: ${newId}`);
    createdFolders[folderName] = newId;
  }

  console.log("\nFolder creation complete!");
  console.log(createdFolders);

  // Update .env.local file contents
  let updatedEnv = envContent;

  // Replace folder IDs
  updatedEnv = updatedEnv.replace(
    /GOOGLE_DRIVE_DESIGNS_FOLDER_ID=.*/,
    `GOOGLE_DRIVE_DESIGNS_FOLDER_ID=${createdFolders["Designs"]}`
  );
  updatedEnv = updatedEnv.replace(
    /GOOGLE_DRIVE_SHOOTS_FOLDER_ID=.*/,
    `GOOGLE_DRIVE_SHOOTS_FOLDER_ID=${createdFolders["Shoots"]}`
  );
  updatedEnv = updatedEnv.replace(
    /GOOGLE_DRIVE_EDITS_FOLDER_ID=.*/,
    `GOOGLE_DRIVE_EDITS_FOLDER_ID=${createdFolders["Edits"]}`
  );

  writeFileSync(envPath, updatedEnv, "utf8");
  console.log("\nUpdated .env.local with new folder IDs.");
}

run().catch((err) => {
  console.error("Error running setup script:", err);
  process.exit(1);
});
