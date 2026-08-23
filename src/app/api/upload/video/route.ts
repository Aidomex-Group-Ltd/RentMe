import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isR2Configured, uploadToR2 } from "@/lib/r2";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 100 * 1024 * 1024; // 100MB

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/avi",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi alternative
  "video/x-matroska", // .mkv
  "video/ogg",
]);

const ALLOWED_EXTENSIONS = new Set([
  "mp4", "webm", "avi", "mov", "mkv", "ogg",
]);

function detectVideoMime(buffer: Buffer): string | null {
  // Check common video file signatures
  if (buffer.length >= 12) {
    // MP4/MOV: ISO-BMFF "ftyp" box at offset 4. Brand at offset 8 tells
    // QuickTime ("qt..") apart from MP4 families; both are the same
    // container family, so unknown brands default to mp4.
    const ftyp = buffer.subarray(4, 8).toString("ascii");
    if (ftyp === "ftyp") {
      const brand = buffer.subarray(8, 12).toString("ascii");
      return brand.startsWith("qt") ? "video/quicktime" : "video/mp4";
    }

    // WebM/MKV: EBML header
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return "video/webm";
    }

    // AVI: RIFF....AVI
    const riff = buffer.subarray(0, 4).toString("ascii");
    if (riff === "RIFF") {
      const avi = buffer.subarray(8, 12).toString("ascii");
      if (avi === "AVI ") return "video/avi";
    }
  }

  return null;
}

/**
 * Magic bytes are authoritative. A client-declared Content-Type or a
 * filename extension can NEVER grant acceptance on its own — they are
 * ignored entirely for the accept/reject decision (gate: MIME verification
 * beyond file.type).
 */
function normalizeContentType(_raw: string | undefined, _fileName: string, buffer: Buffer): string | null {
  return detectVideoMime(buffer);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to upload videos." },
        { status: 401 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 is not configured for video uploads." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const propertyId = formData.get("propertyId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Video must be 100MB or smaller." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The selected video is empty." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = normalizeContentType(file.type, file.name || "video.mp4", buffer);

    if (!contentType || !ALLOWED_VIDEO_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Only MP4, WebM, AVI, MOV, and MKV videos are allowed." },
        { status: 400 }
      );
    }

    // Validate property ownership
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

      // Check video count limit
      const existingCount = await prisma.propertyVideo.count({
        where: { propertyId },
      });

      if (existingCount >= 10) {
        return NextResponse.json(
          { error: "Maximum 10 videos per property." },
          { status: 400 }
        );
      }
    }

    const folder = typeof propertyId === "string" && propertyId
      ? `properties/${propertyId}/videos`
      : `properties/${session.user.id}/videos`;

    const uploaded = await uploadToR2({
      file: buffer,
      contentType,
      fileName: file.name || "video.mp4",
      folder,
    });

    // Save to database if propertyId provided
    if (typeof propertyId === "string" && propertyId.length > 0) {
      const existingCount = await prisma.propertyVideo.count({
        where: { propertyId },
      });

      const video = await prisma.propertyVideo.create({
        data: {
          propertyId,
          url: uploaded.url,
          order: existingCount,
        },
      });

      return NextResponse.json({ ...uploaded, video }, { status: 201 });
    }

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload video. Please try again." },
      { status: 500 }
    );
  }
}
