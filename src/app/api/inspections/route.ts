import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/inspections - Start a new inspection session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Validate cuid format
    if (!/^c[a-z0-9]{24,}$/i.test(propertyId)) {
      return NextResponse.json({ error: "Invalid property ID format" }, { status: 400 });
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, latitude: true, longitude: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Check for existing active session
    const existingSession = await prisma.inspectionSession.findFirst({
      where: {
        propertyId,
        userId: session.user.id,
        status: "ACTIVE",
      },
    });

    if (existingSession) {
      return NextResponse.json({ session: existingSession });
    }

    const inspectionSession = await prisma.inspectionSession.create({
      data: {
        propertyId,
        userId: session.user.id,
        arrivalRadiusM: 50,
      },
    });

    return NextResponse.json({ session: inspectionSession }, { status: 201 });
  } catch (error) {
    console.error("Inspection start error:", error);
    return NextResponse.json(
      { error: "Failed to start inspection" },
      { status: 500 }
    );
  }
}

// GET /api/inspections - List user's inspection sessions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (propertyId) {
      where.propertyId = propertyId;
    }

    const sessions = await prisma.inspectionSession.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            district: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: {
          select: { waypoints: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Inspection list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspections" },
      { status: 500 }
    );
  }
}
