import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive, getDriveImageUrl, getOrCreateFolder } from "@/lib/drive";
import { adminDb, admin } from "@/lib/firebase-admin";
import { Readable } from "stream";

// 60s max on Vercel Hobby — enough for sequential uploads
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ts = () => admin.firestore.FieldValue.serverTimestamp();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawName    = formData.get("name") as string;
    const category   = formData.get("category") as string;
    const varLabels  = formData.get("variationLabels") as string;
    const files      = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 });
    }

    const name       = rawName?.trim() || `Untitled-${Date.now().toString(36).toUpperCase()}`;
    const namePending = !rawName?.trim();
    const labelArr   = varLabels
      ? varLabels.split(",").map((l: string) => l.trim()).filter(Boolean)
      : [];

    // Create date subfolder once
    const dateStr = new Date().toISOString().split("T")[0];
    const designParentId = await getOrCreateFolder(
      dateStr,
      process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID as string
    );

    // ── Sequential upload (never times out regardless of file count/size) ──
    const uploadedFiles: Array<{
      url: any; id: any; fileName: string; downloadUrl: any;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const productName = files.length > 1 ? `${name} - Variation ${i + 1}` : name;

      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      const driveFile = await uploadFileToDrive(
        stream,
        `${productName}-design`,
        file.type,
        designParentId
      );

      uploadedFiles.push({
        url:         driveFile.webViewLink,
        id:          driveFile.id,
        fileName:    file.name,
        downloadUrl: driveFile.webContentLink || null,
      });

      console.log(`[Upload] ${i + 1}/${files.length} done — ${file.name}`);
    }

    // Build Firestore doc
    const variations = uploadedFiles.map((f, i) => ({
      ...f,
      label:        labelArr[i] || `Variation ${i + 1}`,
      thumbnailUrl: f.id ? getDriveImageUrl(f.id as string) : null,
    }));

    const productData: any = {
      name,
      namePending,
      category,
      status:          "Pending Direction",
      mainDesignUrl:   uploadedFiles[0].url,
      mainDesignId:    uploadedFiles[0].id,
      mainDownloadUrl: uploadedFiles[0].downloadUrl || null,
      thumbnailUrl:    uploadedFiles[0].id ? getDriveImageUrl(uploadedFiles[0].id as string) : null,
      variations,
      variationCount:  uploadedFiles.length,
      createdAt:       ts(),
      updatedAt:       ts(),
    };

    // Single-variation backward compat fields
    if (uploadedFiles.length === 1) {
      productData.designUrl   = uploadedFiles[0].url;
      productData.designId    = uploadedFiles[0].id;
      productData.downloadUrl = uploadedFiles[0].downloadUrl || null;
    }

    const docRef = await adminDb.collection("products").add(productData);

    // Notification (non-fatal)
    try {
      await adminDb.collection("notifications").add({
        title:      namePending ? "Name Pending" : "Products Created",
        message:    namePending
          ? "Products uploaded — name pending from director"
          : `${name} uploaded with ${uploadedFiles.length} variation(s)`,
        type:       namePending ? "warning" : "success",
        actionType: "bulk_created",
        read:       false,
        createdAt:  ts(),
      });
    } catch (_) {}

    return NextResponse.json({
      success:        true,
      id:             docRef.id,
      variationCount: uploadedFiles.length,
      namePending,
    });

  } catch (error: any) {
    console.error("===== UPLOAD API ERROR =====");
    console.error("Message:", error.message);
    if (error.response?.data)
      console.error("Drive API:", JSON.stringify(error.response.data).slice(0, 500));
    console.error("============================");
    return NextResponse.json(
      { success: false, error: error.message || "Unknown upload error" },
      { status: 500 }
    );
  }
}
