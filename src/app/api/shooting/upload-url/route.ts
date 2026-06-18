import { NextRequest, NextResponse } from "next/server";
import { getOrCreateFolder, getDriveService } from "@/lib/drive";
import { google } from "googleapis";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { productId, fileName, fileSize, mimeType } = await request.json();

    if (!productId || !fileName || !fileSize || !mimeType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Resolve/create parent folder
    const productSnap = await adminDb.collection("products").doc(productId).get();
    const productName = productSnap.exists ? (productSnap.data()?.name || productId) : productId;
    
    const shootParentId = await getOrCreateFolder(
      productName,
      process.env.GOOGLE_DRIVE_SHOOTS_FOLDER_ID as string
    );

    // Retrieve Auth client to get Access Token
    const serviceAccountEmail = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const SCOPES = ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"];

    let authClient: any;

    if (serviceAccountEmail && rawPrivateKey) {
      const privateKey = rawPrivateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
      authClient = new google.auth.GoogleAuth({
        credentials: { client_email: serviceAccountEmail, private_key: privateKey },
        scopes: SCOPES,
      });
    } else {
      const client_id = process.env.GOOGLE_DRIVE_CLIENT_ID;
      const client_secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
      const refresh_token = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

      if (client_id && client_secret && refresh_token) {
        const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "http://localhost");
        oauth2Client.setCredentials({ refresh_token });
        authClient = oauth2Client;
      }
    }

    if (!authClient) {
      throw new Error("No Google Drive credentials configured");
    }

    const tokenResponse = await authClient.getAccessToken();
    const accessToken = typeof tokenResponse === "string" ? tokenResponse : tokenResponse.token;

    if (!accessToken) {
      throw new Error("Failed to get Google access token");
    }

    // Initiate Google Drive Resumable Upload Session
    const gResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": fileSize.toString(),
      },
      body: JSON.stringify({
        name: `${productId}-${fileName}`,
        parents: [shootParentId],
      }),
    });

    if (!gResponse.ok) {
      const errorText = await gResponse.text();
      throw new Error(`Google Drive API error: ${gResponse.status} - ${errorText}`);
    }

    // Resumable upload session URL is in the Location header
    const uploadUrl = gResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Location header not returned by Google Drive API");
    }

    return NextResponse.json({ success: true, uploadUrl });
  } catch (error: any) {
    console.error("Error generating resumable upload URL:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
