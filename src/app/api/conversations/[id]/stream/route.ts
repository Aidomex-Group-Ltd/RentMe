import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/conversations/[id]/stream?after=<ISO> — Server-Sent Events feed.
 *
 * Real-time transport for messaging. SSE is used instead of raw WebSockets
 * because Next.js App Router route handlers cannot host a WebSocket server
 * without replacing the deployment architecture; SSE provides the same
 * server-push semantics over the existing HTTP path (and passes through the
 * k3s Traefik ingress unchanged).
 *
 * The client connects with a RELATIVE url ("…/stream"), so the host is always
 * discovered dynamically from the page origin — no hardcoded endpoints.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Authorization: only participants may observe the conversation.
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

  // Cursor is a timestamp: only messages newer than it are pushed.
  const afterParam = req.nextUrl.searchParams.get("after") ?? "";
  let cursor = afterParam ? new Date(afterParam) : new Date();
  if (Number.isNaN(cursor.getTime())) cursor = new Date();

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const write = (chunk: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };
      const send = (event: string, data: unknown) =>
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", close);

      send("ready", { conversationId: params.id });

      // Server-side poll → push: one bounded query per tick per connected
      // participant.
      const timer = setInterval(async () => {
        if (closed) return;
        try {
          const fresh = await prisma.message.findMany({
            where: {
              conversationId: params.id,
              createdAt: { gt: cursor },
            },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: {
              sender: { select: { id: true, name: true, avatar: true } },
            },
          });

          for (const m of fresh) {
            cursor = m.createdAt;
            send("message", m);
          }
          if (fresh.length === 0) {
            // Heartbeat keeps intermediaries from idling the stream out.
            if (!write(": ping\n\n")) close();
          }
        } catch {
          send("error", { message: "stream interrupted" });
          close();
        }
      }, 2000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
