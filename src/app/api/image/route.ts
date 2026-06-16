import { NextResponse } from "next/server";
import { getDriveService } from "@/lib/drive";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return new NextResponse("Missing file ID", { status: 400 });
  }

  // Handle cases where a full URL might be passed as an ID
  const cleanId = fileId.match(/[-\w]{25,}/)?.[0] || fileId;

  try {
    const drive = await getDriveService();

    // Fetch file stream from Google Drive
    const response = await drive.files.get(
      { fileId: cleanId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    );

    const headers = new Headers();
    headers.set("Cache-Control", "public, max-age=86400");

    if (response.headers["content-type"]) {
      headers.set("Content-Type", response.headers["content-type"]);
    } else {
      headers.set("Content-Type", "image/jpeg");
    }

    // Use a more efficient way to stream the response
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
    console.error("Image proxy error for ID:", cleanId, error);
    const status = error.status || error.code || 500;
    const message = error.message || "Unknown error";
    return new NextResponse(`Error fetching image: ${message}`, { status: typeof status === 'number' ? status : 500 });
  }
}
