import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeText, validateMessageContent } from "@/lib/sanitize";

// GET /api/conversations/[id] - Get messages for a conversation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: params.id,
          userId: session.user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: params.id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: params.id,
        senderId: { not: session.user.id },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Update last read time
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: params.id,
          userId: session.user.id,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id] - Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: params.id,
          userId: session.user.id,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { content, imageUrl } = await req.json();

    if (!content && !imageUrl) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Validate and sanitize message content
    const rawContent = typeof content === "string" ? content : "";
    const contentError = validateMessageContent(rawContent);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }
    const sanitizedContent = sanitizeText(rawContent, 5000);

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        senderId: session.user.id,
        content: sanitizedContent,
        imageUrl: imageUrl || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: params.id },
      data: { lastMessageAt: new Date(), updatedAt: new Date() },
    });

    // Get other participants for notifications
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: params.id,
        userId: { not: session.user.id },
      },
      select: { userId: true },
    });

    // Create notifications for other participants
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      select: { property: { select: { title: true } } },
    });

    await prisma.notification.createMany({
      data: otherParticipants.map((p) => ({
        userId: p.userId,
        type: "NEW_MESSAGE",
        title: "New message",
        body: `You have a new message about ${conversation?.property?.title || "a property"}`,
        link: `/messages/${params.id}`,
      })),
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
