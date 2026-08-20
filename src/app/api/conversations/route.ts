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

    const { propertyId, recipientId } = await req.json();

    if (!propertyId || !recipientId) {
      return NextResponse.json(
        { error: "propertyId and recipientId are required" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
