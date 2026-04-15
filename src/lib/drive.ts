import { google } from "googleapis";

// This file handles all Google Drive operations
// We use a Service Account for background tasks or OAuth2 for user-acting tasks

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

export async function getDriveService() {
  // If we have a Service Account setup
  if (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      SCOPES
    );
    return google.drive({ version: "v3", auth });
  }

  throw new Error("Google Drive credentials not configured");
}

export async function uploadFileToDrive(
  fileStream: any,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
) {
  const drive = await getDriveService();
  
  const fileMetadata = {
    name: fileName,
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const media = {
    mimeType: mimeType,
    body: fileStream,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink, webContentLink",
  });

  return response.data;
}

export async function getFolderFiles(folderId: string) {
  const drive = await getDriveService();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, webViewLink, thumbnailLink)",
  });
  return response.data.files;
}
