import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/properties/[id]/save - Toggle save
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.savedProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: session.user.id,
          propertyId: params.id,
        },
      },
    });

    if (existing) {
      await prisma.savedProperty.delete({
        where: { id: existing.id },
      });
      await prisma.property.update({
        where: { id: params.id },
        data: { saveCount: { decrement: 1 } },
      });
      return NextResponse.json({ saved: false });
    } else {
      await prisma.savedProperty.create({
        data: {
          userId: session.user.id,
          propertyId: params.id,
        },
      });
      await prisma.property.update({
        where: { id: params.id },
        data: { saveCount: { increment: 1 } },
      });
      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error("Save toggle error:", error);
    return NextResponse.json(
      { error: "Failed to save property" },
      { status: 500 }
    );
  }
}
