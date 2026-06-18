import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, any> = {};

  // 1. Check env vars present
  results.env = {
    hasDriveEmail: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL,
    hasDriveKey: !!process.env.GOOGLE_DRIVE_PRIVATE_KEY,
    hasFirebaseEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasFirebaseKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasDesignsFolder: !!process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID,
    driveEmailPreview: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL?.slice(0, 30),
    driveKeyStart: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.slice(0, 30),
  };

  // 2. Test Drive auth
  try {
    const { getDriveService } = await import("@/lib/drive");
    const drive = await getDriveService();
    const r = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID}' in parents and trashed = false`,
      fields: "files(id,name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 1,
    } as any);
    results.drive = { ok: true, filesFound: r.data.files?.length ?? 0 };
  } catch (e: any) {
    results.drive = { ok: false, error: e.message, code: e.code, status: e.status };
  }

  // 3. Test Firebase Admin
  try {
    const { adminDb } = await import("@/lib/firebase-admin");
    const snap = await adminDb.collection("products").limit(1).get();
    results.firebase = { ok: true, docs: snap.size };
  } catch (e: any) {
    results.firebase = { ok: false, error: e.message };
  }

  // 4. Test folder creation
  try {
    const { getOrCreateFolder } = await import("@/lib/drive");
    const id = await getOrCreateFolder("__diag-test__", process.env.GOOGLE_DRIVE_DESIGNS_FOLDER_ID);
    results.folderCreate = { ok: true, id };
  } catch (e: any) {
    results.folderCreate = { ok: false, error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
