"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Film,
  Loader2,
  AlertCircle,
  Trash2,
  Play,
} from "lucide-react";
import { toast } from "sonner";

interface VideoFile {
  id?: string;
  url?: string;
  file?: File;
  preview?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface PropertyVideoUploadProps {
  propertyId: string;
  existingVideos?: Array<{ id: string; url: string; order: number }>;
  onVideosChange?: (videos: VideoFile[]) => void;
}

const MAX_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = ["mp4", "webm", "avi", "mov", "mkv", "ogg"];
const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/avi",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/ogg",
]);

function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE) {
    return "Video must be 100MB or smaller";
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.has(file.type)) {
    return "Only MP4, WebM, AVI, MOV, and MKV videos are allowed";
  }

  return null;
}

export default function PropertyVideoUpload({
  propertyId,
  existingVideos = [],
  onVideosChange,
}: PropertyVideoUploadProps) {
  const [videos, setVideos] = useState<VideoFile[]>(
    existingVideos.map((v) => ({
      id: v.id,
      url: v.url,
      uploading: false,
    }))
  );
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateVideos = useCallback(
    (newVideos: VideoFile[]) => {
      setVideos(newVideos);
      onVideosChange?.(newVideos);
    },
    [onVideosChange]
  );

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    const newVideos: VideoFile[] = [];

    for (const file of Array.from(files)) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      const videoFile: VideoFile = {
        file,
        preview,
        uploading: true,
        progress: 0,
      };
      newVideos.push(videoFile);
    }

    if (newVideos.length === 0) return;

    const updatedVideos = [...videos, ...newVideos];
    updateVideos(updatedVideos);

    // Upload each video
    for (let i = 0; i < newVideos.length; i++) {
      const video = newVideos[i];
      if (!video.file) continue;

      try {
        const formData = new FormData();
        formData.append("file", video.file);
        formData.append("propertyId", propertyId);

        // Simulate progress (since fetch doesn't support upload progress)
        const progressInterval = setInterval(() => {
          setVideos((prev) => {
            const idx = prev.findIndex((v) => v === video);
            if (idx === -1 || !prev[idx].uploading) return prev;
            const newProgress = Math.min((prev[idx].progress || 0) + 10, 90);
            const updated = [...prev];
            updated[idx] = { ...updated[idx], progress: newProgress };
            return updated;
          });
        }, 200);

        const res = await fetch("/api/upload/video", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        const data = await res.json();

        // Update with the uploaded URL
        setVideos((prev) => {
          const idx = prev.findIndex((v) => v === video);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            id: data.video?.id,
            url: data.url,
            uploading: false,
            progress: 100,
          };
          return updated;
        });

        toast.success(`${video.file.name} uploaded`);
      } catch (error) {
        setVideos((prev) => {
          const idx = prev.findIndex((v) => v === video);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            uploading: false,
            error: error instanceof Error ? error.message : "Upload failed",
          };
          return updated;
        });
        toast.error(`Failed to upload ${video.file.name}`);
      }
    }
  };

  const removeVideo = async (index: number) => {
    const video = videos[index];

    // If it has an ID, delete from server
    if (video.id) {
      try {
        const res = await fetch(`/api/properties/${propertyId}/videos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: video.id }),
        });

        if (!res.ok) {
          toast.error("Failed to delete video");
          return;
        }
      } catch {
        toast.error("Failed to delete video");
        return;
      }
    }

    // Clean up preview URL
    if (video.preview) {
      URL.revokeObjectURL(video.preview);
    }

    const updated = videos.filter((_, i) => i !== index);
    updateVideos(updated);
    toast.success("Video removed");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <button
        type="button"
        disabled={videos.length >= 10}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? "border-brand-400 bg-brand-50/40"
            : videos.length >= 10
              ? "border-gray-200 opacity-60"
              : "border-gray-300 hover:border-brand-400 hover:bg-brand-50/40"
        }`}
      >
        <Film className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-700">
          Tap to add videos
        </p>
        <p className="mt-1 text-xs text-gray-500">
          MP4, WebM, AVI, MOV — max 100MB each · up to 10 videos
        </p>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/avi,video/quicktime,video/x-msvideo,video/x-matroska,video/ogg,.mp4,.webm,.avi,.mov,.mkv,.ogg"
        multiple
        className="sr-only"
        aria-label="Upload property videos"
        onChange={(e) => void addFiles(e.target.files)}
      />

      {/* Video list */}
      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div
              key={video.id || video.preview || index}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              {/* Preview */}
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-gray-100">
                {video.preview || video.url ? (
                  <>
                    <video
                      src={video.preview || video.url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Film className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {video.file?.name || `Video ${index + 1}`}
                </p>
                {video.file && (
                  <p className="text-xs text-gray-400">
                    {(video.file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                )}

                {/* Progress bar */}
                {video.uploading && (
                  <div className="mt-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${video.progress || 0}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Uploading… {video.progress || 0}%
                    </p>
                  </div>
                )}

                {/* Error */}
                {video.error && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {video.error}
                  </p>
                )}

                {/* Success */}
                {!video.uploading && !video.error && video.url && (
                  <p className="mt-0.5 text-xs text-green-600">Uploaded</p>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => void removeVideo(index)}
                disabled={video.uploading}
                className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {video.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
