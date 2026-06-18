import { NextResponse } from "next/server";
import { getDriveService } from "@/lib/drive";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  const fileName = searchParams.get("name") || "download";

  if (!fileId) {
    return new NextResponse("Missing file ID", { status: 400 });
  }

  const cleanId = fileId.match(/[-\w]{25,}/)?.[0] || fileId;

  try {
    const drive = await getDriveService();

    const fileMeta = await drive.files.get({
      fileId: cleanId,
      fields: "name, mimeType",
      supportsAllDrives: true,
    });

    const response = await drive.files.get(
      { fileId: cleanId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    );

    const mimeType = fileMeta.data.mimeType || "application/octet-stream";
    const safeName = (fileMeta.data.name || fileName).replace(/[^a-zA-Z0-9._-]/g, "_");

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Content-Disposition", `attachment; filename="${safeName}"`);
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response.data as any) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new NextResponse(stream, { headers });
  } catch (error: any) {
    console.error("Download proxy error for ID:", cleanId, error);
    const status = error.status || error.code || 500;
    const message = error.message || "Unknown error";
    return new NextResponse(`Error downloading file: ${message}`, { status: typeof status === 'number' ? status : 500 });
  }
}
