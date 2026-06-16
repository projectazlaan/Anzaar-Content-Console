import { NextResponse } from "next/server";
import { getDriveService } from "@/lib/drive";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return new NextResponse("Missing file ID", { status: 400 });
  }

  try {
    const drive = await getDriveService();
    
    // Fetch file stream from Google Drive
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    const headers = new Headers();
    // Cache the image in the browser for 1 day
    headers.set("Cache-Control", "public, max-age=86400");
    
    // Set content type from Drive response
    if (response.headers["content-type"]) {
      headers.set("Content-Type", response.headers["content-type"]);
    } else {
      headers.set("Content-Type", "image/jpeg"); // Fallback
    }

    return new NextResponse(response.data as any, { headers });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Error fetching image from Drive", { status: 500 });
  }
}
