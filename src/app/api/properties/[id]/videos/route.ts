import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteFromR2, keyFromPublicUrl } from "@/lib/r2";

// GET /api/properties/[id]/videos - List videos for a property
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videos = await prisma.propertyVideo.findMany({
      where: { propertyId: params.id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Videos fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// DELETE /api/properties/[id]/videos - Delete a video
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const video = await prisma.propertyVideo.findFirst({
      where: { id: videoId, propertyId: params.id },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.propertyVideo.delete({ where: { id: videoId } });

    // Best-effort storage cleanup — the DB row is the source of truth;
    // a failed object delete must not fail the request (background
    // lifecycle policies can catch strays).
    const key = keyFromPublicUrl(video.url);
    if (key) {
      try {
        await deleteFromR2(key);
      } catch (storageError) {
        console.error("Video storage delete failed:", { key, storageError });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Video delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
