import { NextRequest, NextResponse } from "next/server";
import { getDriveService } from "@/lib/drive";
import { adminDb, admin } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ts = () => admin.firestore.FieldValue.serverTimestamp();

export async function POST(request: NextRequest) {
  try {
    const { productId, fileId, fileName } = await request.json();

    if (!productId || !fileId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const drive = await getDriveService();

    // 1. Grant read permissions
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: { role: "reader", type: "anyone" },
        supportsAllDrives: true,
      } as any);
    } catch (permErr: any) {
      console.warn("[Drive] Could not set public read permission:", permErr.message);
    }

    // 2. Fetch file metadata
    const fileMeta = await drive.files.get({
      fileId: fileId,
      fields: "webViewLink, webContentLink",
      supportsAllDrives: true,
    } as any);

    const webViewLink = fileMeta.data.webViewLink || "";
    const webContentLink = fileMeta.data.webContentLink || `https://docs.google.com/uc?export=download&id=${fileId}`;

    // 3. Append to Firestore arrays
    await adminDb.collection("products").doc(productId).update({
      rawUrls: admin.firestore.FieldValue.arrayUnion(webViewLink),
      rawIds: admin.firestore.FieldValue.arrayUnion(fileId),
      rawDownloadUrls: admin.firestore.FieldValue.arrayUnion(webContentLink),
      updatedAt: ts(),
    });

    return NextResponse.json({ success: true, webViewLink, webContentLink });
  } catch (error: any) {
    console.error("Error confirming upload:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
