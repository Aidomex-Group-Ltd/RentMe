import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/applications - Submit a rental application
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Validate string fields have reasonable lengths
    const MAX_FIELD_LEN = 2000;
    const personalInfo = typeof body.personalInfo === "string" ? body.personalInfo.trim().slice(0, MAX_FIELD_LEN) : null;
    const employmentInfo = typeof body.employmentInfo === "string" ? body.employmentInfo.trim().slice(0, MAX_FIELD_LEN) : null;
    const incomeRange = typeof body.incomeRange === "string" ? body.incomeRange.trim().slice(0, 200) : null;
    const references = typeof body.references === "string" ? body.references.trim().slice(0, MAX_FIELD_LEN) : null;
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;
    const preferredMoveIn = typeof body.preferredMoveIn === "string" ? body.preferredMoveIn : null;

    // Validate preferredMoveIn is a valid future date if provided
    if (preferredMoveIn) {
      const d = new Date(preferredMoveIn);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid preferredMoveIn date" }, { status: 400 });
      }
    }

    // Verify property exists (userId guards self-apply, title feeds the owner notification)
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, userId: true, title: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Cannot apply to own property
    if (property.userId === session.user.id) {
      return NextResponse.json({ error: "You cannot apply to your own property" }, { status: 400 });
    }

    // Check for existing application
    const existing = await prisma.application.findUnique({
      where: {
        propertyId_tenantId: {
          propertyId,
          tenantId: session.user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this property" },
        { status: 409 }
      );
    }

    const application = await prisma.application.create({
      data: {
        propertyId,
        tenantId: session.user.id,
        personalInfo: personalInfo || null,
        employmentInfo: employmentInfo || null,
        incomeRange: incomeRange || null,
        references: references || null,
        preferredMoveIn: preferredMoveIn ? new Date(preferredMoveIn) : null,
        notes: notes || null,
      },
    });

    // Notify the property owner
    if (property) {
      await prisma.notification.create({
        data: {
          userId: property.userId,
          type: "APPLICATION_UPDATE",
          title: "New rental application",
          body: `Someone applied for "${property.title}"`,
          link: `/applications`,
        },
      });
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("Application creation error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

// GET /api/applications - List applications
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "tenant";

    let applications;

    if (role === "landlord" || role === "agent") {
      applications = await prisma.application.findMany({
        where: { property: { userId: session.user.id } },
        include: {
          property: { select: { id: true, title: true, rent: true, district: true } },
          tenant: { select: { id: true, name: true, avatar: true, email: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      applications = await prisma.application.findMany({
        where: { tenantId: session.user.id },
        include: {
          property: { select: { id: true, title: true, rent: true, district: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
