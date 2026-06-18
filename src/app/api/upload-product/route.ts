import { NextRequest, NextResponse } from "next/server";
import { uploadFileToDrive, getDriveImageUrl, getOrCreateFolder } from "@/lib/drive";
import { adminDb, admin } from "@/lib/firebase-admin";
import { Readable } from "stream";

// Vercel hobby = 10s for server actions, but API routes support maxDuration
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ts = () => admin.firestore.FieldValue.serverTimestamp();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const rawName = formData.get("name") as string;
    const category = formData.get("category") as string;
    const variationLabels = formData.get("variationLabels") as string;
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 });
    }

    const name = rawName?.trim() || `Untitled-${Date.now().toString(36).toUpperCase()}`;
    const namePending = !rawName?.trim();

    const dateStr = new Date().toISOString().split("T")[0];
    const designParentId = await getOrCreateFolder(
      dateStr,
      process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID as string
    );

    // Upload all files to Drive
    const uploadPromises = files.map(async (file, index) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      const productName = files.length > 1 ? `${name} - Variation ${index + 1}` : name;
      const driveFile = await uploadFileToDrive(
        stream,
        `${productName}-design`,
        file.type,
        designParentId
      );
      return {
        url: driveFile.webViewLink,
        id: driveFile.id,
        fileName: file.name,
        downloadUrl: driveFile.webContentLink || null,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    // Parse variation labels
    const labelArr = variationLabels
      ? variationLabels.split(",").map((l: string) => l.trim()).filter(Boolean)
      : [];

    const variations = uploadedFiles.map((file, index) => ({
      ...file,
      label: labelArr[index] || `Variation ${index + 1}`,
      thumbnailUrl: file.id ? getDriveImageUrl(file.id as string) : null,
    }));

    const productData: any = {
      name,
      namePending,
      category,
      status: "Pending Direction",
      mainDesignUrl: uploadedFiles[0].url,
      mainDesignId: uploadedFiles[0].id,
      mainDownloadUrl: uploadedFiles[0].downloadUrl || null,
      thumbnailUrl: uploadedFiles[0].id ? getDriveImageUrl(uploadedFiles[0].id as string) : null,
      variations,
      variationCount: uploadedFiles.length,
      createdAt: ts(),
      updatedAt: ts(),
    };

    if (uploadedFiles.length === 1) {
      productData.designUrl = uploadedFiles[0].url;
      productData.designId = uploadedFiles[0].id;
      productData.downloadUrl = uploadedFiles[0].downloadUrl || null;
    }

    const docRef = await adminDb.collection("products").add(productData);

    // Notification (non-fatal)
    try {
      const msg = namePending
        ? "Products uploaded — name pending from director"
        : `${name} created with ${uploadedFiles.length} variation(s)`;
      await adminDb.collection("notifications").add({
        title: namePending ? "Name Pending" : "Bulk Products Created",
        message: msg,
        type: namePending ? "warning" : "success",
        actionType: "bulk_created",
        read: false,
        createdAt: ts(),
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      id: docRef.id,
      variationCount: uploadedFiles.length,
      namePending,
    });
  } catch (error: any) {
    console.error("===== UPLOAD API ERROR =====");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack?.slice(0, 500));
    if (error.response?.data) console.error("Drive API:", JSON.stringify(error.response.data).slice(0, 500));
    console.error("============================");
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
