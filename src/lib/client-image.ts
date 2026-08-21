/**
 * Client-side helpers for property photo uploads (especially Android Chrome).
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const TARGET_BYTES = 1.8 * 1024 * 1024;
const MAX_DIMENSION = 1920;

function extensionOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function looksLikeImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  return /^(jpe?g|png|webp|gif)$/i.test(extensionOf(file.name || ""));
}

export function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function mimeFromExtension(name: string): string | null {
  switch (extensionOf(name)) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return null;
  }
}

/**
 * Compress / resize a photo for upload. Android cameras often produce 8–15MB
 * JPEGs that exceed the API limit and may report an empty MIME type.
 */
export async function preparePropertyImage(file: File): Promise<File> {
  const displayName = file.name || "photo.jpg";

  if (isHeicLike(file)) {
    throw new Error(
      "HEIC photos aren’t supported. In your camera settings, switch to JPEG, or pick a JPG/PNG from the gallery."
    );
  }

  if (!looksLikeImageFile(file)) {
    throw new Error(`“${displayName}” is not a supported image (use JPEG, PNG, or WebP).`);
  }

  const knownType =
    (file.type && ALLOWED_MIME.has(file.type) ? file.type : null) ||
    mimeFromExtension(displayName);

  // Small enough already with a usable type — upload as-is
  if (file.size <= TARGET_BYTES && knownType && knownType !== "image/jpg") {
    if (!file.type && knownType) {
      return new File([file], displayName, { type: knownType, lastModified: file.lastModified });
    }
    return file;
  }

  // Decode (works when type is empty on Android if the bytes are valid)
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Fallback: force a type from extension and retry
    if (knownType) {
      const typed = new File([file], displayName, {
        type: knownType === "image/jpg" ? "image/jpeg" : knownType,
        lastModified: file.lastModified,
      });
      try {
        bitmap = await createImageBitmap(typed);
      } catch {
        throw new Error(
          `Could not read “${displayName}”. Try another photo or export it as JPEG.`
        );
      }
    } else {
      throw new Error(
        `Could not read “${displayName}”. Try another photo or export it as JPEG.`
      );
    }
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process photo on this device.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = "image/jpeg";
  let quality = 0.85;
  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, outputType, quality)
  );

  while (blob && blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
  }

  if (!blob) {
    throw new Error(`Could not compress “${displayName}”. Try a smaller photo.`);
  }

  if (blob.size > 8 * 1024 * 1024) {
    throw new Error(
      `“${displayName}” is still too large after compression. Try a lower-resolution photo.`
    );
  }

  const outName = displayName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], outName, { type: outputType, lastModified: Date.now() });
}
