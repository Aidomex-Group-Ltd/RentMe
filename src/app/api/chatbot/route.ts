import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildBotMessage, fallbackMessage, generateResponse } from "@/lib/chatbot-engine";

const CHATBOT_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000, keyPrefix: "chatbot" } as const;

export async function POST(req: NextRequest) {
  try {
    // Rate limit the chatbot to prevent abuse
    const ip = getClientIp(req.headers);
    const rateLimitResult = checkRateLimit(ip, CHATBOT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Validate and sanitize message
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ error: "Message too long (max 500 characters)" }, { status: 400 });
    }

    // Simulate typing delay (100-300ms)
    const delay = 100 + Math.random() * 200;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const { content, quickReplies } = generateResponse(message);

    return NextResponse.json({ message: buildBotMessage(content, quickReplies) });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      { message: fallbackMessage() },
      { status: 200 } // Return 200 so the UI can show the fallback message
    );
  }
}
