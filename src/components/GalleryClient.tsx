"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { Role } from "@/lib/auth";

interface MediaItem {
  url: string;
  pathname: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function GalleryClient({ role }: { role: Role }) {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media");
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Close lightbox on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleDownload(item: MediaItem) {
    const res = await fetch(item.url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    setUploading(true);
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const label = fileArray.length > 1 ? `(${i + 1}/${fileArray.length}) ` : "";
      setUploadProgress(`${label}Uploading ${file.name}…`);

      try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        await upload(`${timestamp}_${safeName}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
      } catch (err) {
        errors.push(file.name);
        console.error("Upload error:", err);
      }
    }

    if (errors.length) {
      setUploadProgress(`Failed: ${errors.join(", ")}`);
    } else {
      setUploadProgress("Upload complete!");
      await fetchMedia();
      setTimeout(() => {
        setUploadProgress("");
        setShowUploadPanel(false);
      }, 2000);
    }

    setUploading(false);
  }

  async function handleDelete(url: string) {
    const res = await fetch("/api/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      setMedia((prev) => prev.filter((m) => m.url !== url));
      if (lightbox?.url === url) setLightbox(null);
    }
    setDeleteConfirm(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (role !== "uploader") return;
    handleUpload(e.dataTransfer.files);
  }

  const images = media.filter((m) => m.contentType.startsWith("image/"));
  const videos = media.filter((m) => m.contentType.startsWith("video/"));

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <h1 className="text-lg font-bold tracking-tight">Gallery</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline text-xs text-zinc-500 capitalize bg-zinc-800 px-2 py-1 rounded">
              {role}
            </span>
            {role === "uploader" && (
              <button
                onClick={() => setShowUploadPanel((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-900 text-sm font-semibold rounded-lg hover:bg-zinc-100 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-500 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Upload Panel */}
      {role === "uploader" && showUploadPanel && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div
            className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-colors ${
              dragOver ? "border-white bg-zinc-800" : "border-zinc-700 hover:border-zinc-500"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
            <svg className="w-10 h-10 mx-auto text-zinc-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? (
              <p className="text-zinc-300 text-sm">{uploadProgress}</p>
            ) : uploadProgress ? (
              <p className="text-green-400 text-sm">{uploadProgress}</p>
            ) : (
              <>
                <p className="text-zinc-300 text-sm mb-1">
                  <span className="sm:hidden">Tap to choose files</span>
                  <span className="hidden sm:inline">Drag & drop files here, or</span>
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-white underline hover:no-underline"
                >
                  <span className="sm:hidden">Browse files</span>
                  <span className="hidden sm:inline">browse to upload</span>
                </button>
                <p className="text-zinc-600 text-xs mt-2">Images & videos up to 500 MB</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-zinc-500">
            <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-24 text-zinc-500">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 4.5h16.5" />
            </svg>
            <p className="text-lg">No media yet</p>
            {role === "uploader" && (
              <button
                onClick={() => setShowUploadPanel(true)}
                className="mt-4 text-sm text-white underline"
              >
                Upload your first file
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {images.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  Photos ({images.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {images.map((item) => (
                    <MediaCard
                      key={item.url}
                      item={item}
                      role={role}
                      onOpen={() => setLightbox(item)}
                      onDownload={() => handleDownload(item)}
                      onDelete={() => setDeleteConfirm(item.url)}
                    />
                  ))}
                </div>
              </section>
            )}

            {videos.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                  Videos ({videos.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {videos.map((item) => (
                    <MediaCard
                      key={item.url}
                      item={item}
                      role={role}
                      onOpen={() => setLightbox(item)}
                      onDownload={() => handleDownload(item)}
                      onDelete={() => setDeleteConfirm(item.url)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          {/* Lightbox header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-zinc-300 truncate max-w-[60vw]">{lightbox.filename}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(lightbox)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Download</span>
              </button>
              {role === "uploader" && (
                <button
                  onClick={() => setDeleteConfirm(lightbox.url)}
                  className="px-3 py-1.5 text-sm bg-red-900/60 hover:bg-red-800 rounded-lg transition"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setLightbox(null)}
                className="p-1.5 text-zinc-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Media */}
          <div
            className="flex-1 flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setLightbox(null)}
          >
            {lightbox.contentType.startsWith("video/") ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.url}
                alt={lightbox.filename}
                className="max-w-full max-h-full object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>

          {/* Lightbox footer */}
          <div className="px-4 py-2 bg-black/50 text-center">
            <p className="text-xs text-zinc-500">
              {formatDate(lightbox.uploadedAt)} · {formatSize(lightbox.size)}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-lg mb-2">Delete file?</h3>
            <p className="text-zinc-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-zinc-700 rounded-lg text-sm hover:border-zinc-500 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaCard({
  item,
  role,
  onOpen,
  onDownload,
  onDelete,
}: {
  item: MediaItem;
  role: Role;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const isVideo = item.contentType.startsWith("video/");

  return (
    <div className="group relative bg-zinc-900 rounded-lg overflow-hidden aspect-square cursor-pointer">
      <div className="absolute inset-0" onClick={onOpen}>
        {isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <video
              src={item.url}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto">
        <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            title="Download"
            className="flex-1 py-1.5 bg-white/90 hover:bg-white text-zinc-900 rounded text-xs font-semibold transition"
          >
            ↓ Save
          </button>
          {role === "uploader" && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete"
              className="px-2 py-1.5 bg-red-600/90 hover:bg-red-600 rounded text-xs font-semibold transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
