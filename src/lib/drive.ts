import { google } from "googleapis";

// This file handles all Google Drive operations using OAuth2 Refresh Token
// This allows the app to act as a personal Gmail user and use their quota.

const SCOPES = ["https://www.googleapis.com/auth/drive"];

export async function getDriveService() {
  const client_id = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refresh_token = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    // If OAuth2 credentials are not set, try falling back to Service Account (Legacy/Read-only)
    const client_email = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
    const private_key = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (client_email && private_key) {
      console.warn("Using Service Account fallback. Uploads might fail due to quota.");
      const auth = new google.auth.GoogleAuth({
        credentials: { client_email, private_key },
        scopes: SCOPES,
      });
      return google.drive({ version: "v3", auth });
    }

    throw new Error("Google Drive OAuth2 credentials not fully configured. Please set CLIENT_ID, CLIENT_SECRET, and REFRESH_TOKEN.");
  }

  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    "http://localhost" // Redirect URI (not strictly needed for background refresh)
  );

  oauth2Client.setCredentials({ refresh_token });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function uploadFileToDrive(
  fileStream: any,
  fileName: string,
  mimeType: string,
  parentFolderId?: string | null
) {
  const drive = await getDriveService();
  
  const fileMetadata: any = {
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
    supportsAllDrives: true,
  } as any);

  return response.data;
}

export async function getFolderFiles(folderId: string) {
  const drive = await getDriveService();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, webViewLink, webContentLink, thumbnailLink)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  } as any);
  return response.data.files;
}

export async function getOrCreateFolder(folderName: string, parentId?: string) {
  const drive = await getDriveService();
  
  // Search for folder
  const q = parentId 
    ? `name = '${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    
  const searchResponse = await drive.files.list({
    q,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  } as any);

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id;
  }

  // Create folder if not found
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : undefined,
  };

  const createResponse = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id",
    supportsAllDrives: true,
  } as any);

  return createResponse.data.id;
}

// Helper function to get displayable image URL from Google Drive file ID
export function getDriveImageUrl(fileId: string): string {
  // Use secure local proxy to bypass Drive CORS and permissions
  return `/api/image?id=${fileId}`;
}

// Get higher resolution image URL
export function getDriveImageHighResUrl(fileId: string): string {
  return `/api/image?id=${fileId}`;
}
