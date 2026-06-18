import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive",
];

export async function getDriveService() {
  // --- Try Service Account first (most reliable, never expires) ---
  const serviceAccountEmail =
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey =
    process.env.GOOGLE_DRIVE_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountEmail && rawPrivateKey) {
    // Handle all key formats: literal \n, escaped \\n, or real newlines
    const privateKey = rawPrivateKey
      .replace(/^"|"$/g, "")
      .replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey,
      },
      scopes: SCOPES,
    });

    console.log("[Drive] Service Account client configured");
    return google.drive({ version: "v3", auth });
  }

  // --- Fallback: OAuth2 ---
  const client_id = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refresh_token = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (client_id && client_secret && refresh_token) {
    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      "http://localhost"
    );
    oauth2Client.setCredentials({ refresh_token });
    console.log("[Drive] OAuth2 client configured with refresh token");
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  throw new Error(
    "Google Drive credentials not configured. Set GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY in environment variables."
  );
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

  // Grant 'anyone with link' read access so the site proxy can always serve it
  if (response.data.id) {
    try {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: "reader", type: "anyone" },
        supportsAllDrives: true,
      } as any);
    } catch (permErr: any) {
      // Non-fatal — proxy still works via service account auth
      console.warn("[Drive] Could not set public read permission:", permErr.message);
    }
  }

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
