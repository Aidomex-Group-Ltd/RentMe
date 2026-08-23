import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/conversations - List user's conversations
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: session.user.id },
        },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            rent: true,
            district: true,
            neighborhood: true,
            images: {
              where: { isCover: true },
              take: 1,
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Start a new conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";
    const recipientId = typeof body.recipientId === "string" ? body.recipientId.trim() : "";

    if (!propertyId || !recipientId) {
      return NextResponse.json(
        { error: "propertyId and recipientId are required" },
        { status: 400 }
      );
    }

    // Prevent users from messaging themselves
    if (recipientId === session.user.id) {
      return NextResponse.json({ error: "Cannot create a conversation with yourself" }, { status: 400 });
    }

    // Validate IDs are cuid-like format (not SQL injectable)
    if (!/^c[a-z0-9]{24,}$/i.test(propertyId) || !/^c[a-z0-9]{24,}$/i.test(recipientId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, userId: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        propertyId,
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ conversation: existing });
    }

    const conversation = await prisma.conversation.create({
      data: {
        propertyId,
        participants: {
          create: [
            { userId: session.user.id },
            { userId: recipientId },
          ],
        },
      },
      include: {
        property: {
          select: { id: true, title: true, rent: true, district: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Conversation creation error:", error);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
