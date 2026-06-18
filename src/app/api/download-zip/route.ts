import { NextResponse } from "next/server";
import { getDriveService } from "@/lib/drive";

export async function POST(request: Request) {
  try {
    const { files } = await request.json();
    if (!files || !Array.isArray(files) || files.length === 0) {
      return new NextResponse("Missing files", { status: 400 });
    }

    const drive = await getDriveService();
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const file of files) {
      const fileId = file.id?.match(/[-\w]{25,}/)?.[0];
      if (!fileId) continue;
      try {
        const meta = await drive.files.get({ fileId, fields: "name", supportsAllDrives: true });
        const name = meta.data.name || file.name || "file";
        const response = await drive.files.get(
          { fileId, alt: "media", supportsAllDrives: true },
          { responseType: "arraybuffer" }
        );
        zip.file(name, response.data as any);
      } catch (e) {
        // skip failed files
      }
    }

    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const uint8 = new Uint8Array(buf);

    return new NextResponse(uint8 as unknown as string, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="assets.zip"`,
        "Content-Length": String(uint8.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("ZIP creation error:", error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
