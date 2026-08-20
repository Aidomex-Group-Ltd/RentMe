import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/viewings - List viewing requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "tenant";

    let viewings;

    if (role === "landlord" || role === "agent") {
      // Get viewings for properties owned by this user
      viewings = await prisma.viewingRequest.findMany({
        where: {
          property: {
            userId: session.user.id,
          },
        },
        include: {
          property: {
            select: { id: true, title: true, rent: true, district: true },
          },
          tenant: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Get viewings made by this tenant
      viewings = await prisma.viewingRequest.findMany({
        where: {
          tenantId: session.user.id,
        },
        include: {
          property: {
            select: { id: true, title: true, rent: true, district: true },
          },
          responder: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ viewings });
  } catch (error) {
    console.error("Viewings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch viewings" },
      { status: 500 }
    );
  }
}

// POST /api/viewings - Create a viewing request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, date, time, numberOfPeople, message } = await req.json();

    if (!propertyId || !date || !time) {
      return NextResponse.json(
        { error: "propertyId, date, and time are required" },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true, title: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const viewing = await prisma.viewingRequest.create({
      data: {
        propertyId,
        tenantId: session.user.id,
        date: new Date(date),
        time,
        numberOfPeople: numberOfPeople || 1,
        message: message || null,
      },
      include: {
        property: {
          select: { id: true, title: true, rent: true, district: true },
        },
      },
    });

    // Notify the landlord/agent
    await prisma.notification.create({
      data: {
        userId: property.userId,
        type: "VIEWING_REQUEST",
        title: "New viewing request",
        body: `Someone wants to view "${property.title}"`,
        link: `/viewings`,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "ViewingRequest",
        entityId: viewing.id,
      },
    });

    return NextResponse.json({ viewing }, { status: 201 });
  } catch (error) {
    console.error("Viewing creation error:", error);
    return NextResponse.json(
      { error: "Failed to create viewing request" },
      { status: 500 }
    );
  }
}
