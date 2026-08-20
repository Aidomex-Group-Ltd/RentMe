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

    const { propertyId, personalInfo, employmentInfo, incomeRange, references, preferredMoveIn, notes } = await req.json();

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
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

    // Get property owner for notification
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true, title: true },
    });

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
