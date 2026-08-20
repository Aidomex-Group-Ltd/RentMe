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

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 is not configured. Add CLOUDFLARE_R2_BUCKET and CLOUDFLARE_R2_PUBLIC_URL (or S3_API) in Vercel.",
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

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 8MB or smaller" },
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder =
      typeof folderRaw === "string" && folderRaw.trim()
        ? folderRaw.trim()
        : typeof propertyId === "string" && propertyId
          ? `properties/${propertyId}`
          : `properties/${session.user.id}`;

    const uploaded = await uploadToR2({
      file: buffer,
      contentType: file.type,
      fileName: file.name,
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
