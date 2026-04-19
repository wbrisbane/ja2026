import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionRole } from "@/lib/auth";
import { getClientIP, logEvent } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const role = await getSessionRole();
        if (role !== "uploader") {
          logEvent("upload_forbidden", { ip, role: role ?? "none", pathname });
          throw new Error("Forbidden");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/heic",
            "image/heif",
            "image/avif",
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-msvideo",
          ],
          maximumSizeInBytes: 4 * 1024 * 1024 * 1024, // 4 GB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        logEvent("upload_success", { ip, pathname: blob.pathname, url: blob.url });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
