import { list, del } from "@vercel/blob";

export interface MediaItem {
  url: string;
  pathname: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
}

const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
};

function contentTypeFromPathname(pathname: string): string | null {
  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext] ?? null;
}

export function isVideo(contentType: string): boolean {
  return contentType.startsWith("video/");
}

export function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export async function listMedia(): Promise<MediaItem[]> {
  const { blobs } = await list();
  return blobs
    .map((b) => {
      const contentType = contentTypeFromPathname(b.pathname);
      if (!contentType) return null;
      return {
        url: b.url,
        pathname: b.pathname,
        filename: b.pathname.split("/").pop() ?? b.pathname,
        contentType,
        size: b.size,
        uploadedAt: b.uploadedAt,
      };
    })
    .filter((item): item is MediaItem => item !== null)
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

export async function deleteMedia(url: string): Promise<void> {
  await del(url);
}
