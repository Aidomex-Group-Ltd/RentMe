import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Android often sends "" or application/octet-stream for camera/gallery files. */
function detectImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (buffer.length >= 6) {
    const head = buffer.subarray(0, 6).toString("ascii");
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function mimeFromFileName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
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

function normalizeContentType(raw: string | undefined, fileName: string, buffer: Buffer): string | null {
  const declared = (raw || "").toLowerCase().trim();
  if (declared === "image/jpg") return "image/jpeg";
  if (ALLOWED_TYPES.has(declared)) {
    return declared === "image/jpg" ? "image/jpeg" : declared;
  }

  // Empty / octet-stream / weird Android types — sniff bytes, then extension
  if (
    !declared ||
    declared === "application/octet-stream" ||
    declared === "binary/octet-stream" ||
    declared === "image"
  ) {
    return detectImageMime(buffer) || mimeFromFileName(fileName);
  }

  // Declared type not allowed — still accept if magic bytes say it's an image
  return detectImageMime(buffer);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to upload photos." },
        { status: 401 }
      );
    }

    if (!isR2Configured()) {
      const missing = [
        !process.env.CLOUDFLARE_S3_ACCESS_KEY_ID && "CLOUDFLARE_S3_ACCESS_KEY_ID",
        !process.env.CLOUDFLARE_S3_SECRET_ACCESS_KEY && "CLOUDFLARE_S3_SECRET_ACCESS_KEY",
        !process.env.CLOUDFLARE_R2_ENDPOINT && "CLOUDFLARE_R2_ENDPOINT",
        !(process.env.CLOUDFLARE_R2_BUCKET || process.env.R2_BUCKET) && "CLOUDFLARE_R2_BUCKET",
        !(
          process.env.CLOUDFLARE_R2_PUBLIC_URL ||
          process.env.S3_API ||
          process.env.NEXT_PUBLIC_R2_PUBLIC_URL
        ) && "CLOUDFLARE_R2_PUBLIC_URL (or S3_API)",
      ].filter(Boolean);

      return NextResponse.json(
        {
          error: `Cloudflare R2 is not fully configured. Missing: ${missing.join(", ") || "R2 settings"}.`,
        },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const propertyId = formData.get("propertyId");
    const folderRaw = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            "Image must be 8MB or smaller. On Android, try a lower camera resolution or let the app compress the photo first.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The selected photo is empty. Please choose another image." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = normalizeContentType(file.type, file.name || "photo.jpg", buffer);

    if (!contentType || !ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          error:
            "Only JPEG, PNG, WebP, and GIF images are allowed. If you took this on Android, export or retake as JPEG.",
        },
        { status: 400 }
      );
    }

    if (typeof propertyId === "string" && propertyId.length > 0) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { userId: true },
      });

      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      if (property.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const folder =
      typeof folderRaw === "string" && folderRaw.trim()
        ? folderRaw.trim()
        : typeof propertyId === "string" && propertyId
          ? `properties/${propertyId}`
          : `properties/${session.user.id}`;

    const uploaded = await uploadToR2({
      file: buffer,
      contentType: contentType === "image/jpg" ? "image/jpeg" : contentType,
      fileName: file.name || `photo.${contentType.split("/")[1] || "jpg"}`,
      folder,
    });

    if (typeof propertyId === "string" && propertyId.length > 0) {
      const existingCount = await prisma.propertyImage.count({
        where: { propertyId },
      });

      const image = await prisma.propertyImage.create({
        data: {
          propertyId,
          url: uploaded.url,
          alt: file.name || "Property photo",
          order: existingCount,
          isCover: existingCount === 0,
        },
      });

      return NextResponse.json({ ...uploaded, image }, { status: 201 });
    }

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
