import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  buildBotMessage,
  fallbackMessage,
  generateResponse,
  type ChatMessage,
} from "@/lib/chatbot-engine";

/**
 * POST /api/chatbot/message — Support Chatbot Engine (Stage 7).
 *
 * Backend-only proxy route. When CHATBOT_PROXY_URL + CHATBOT_PROXY_API_KEY
 * are configured (server-side env only — never NEXT_PUBLIC_*), the message is
 * forwarded to the upstream assistant with conversation context. Any proxy
 * failure, timeout, or missing configuration degrades gracefully to the
 * rule-based engine, so the UI never surfaces a hard error. API keys never
 * reach the browser bundle.
 */

const CHATBOT_RATE_LIMIT = { maxRequests: 30, windowMs: 60_000, keyPrefix: "chatbot" } as const;
const PROXY_TIMEOUT_MS = 8_000;

interface ProxyPayload {
  reply?: string;
  response?: string;
  content?: string;
  message?: string | { content?: string };
}

function extractProxyText(data: ProxyPayload): string | null {
  const m = data.message;
  if (typeof m === "object" && m?.content) return m.content;
  if (typeof m === "string") return m;
  return data.reply ?? data.response ?? data.content ?? null;
}

async function proxyToUpstream(
  message: string,
  conversationHistory: unknown[]
): Promise<{ text: string; quickReplies?: string[] } | null> {
  const url = process.env.CHATBOT_PROXY_URL;
  const apiKey = process.env.CHATBOT_PROXY_API_KEY;
  if (!url || !apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        // Key stays server-side; only this outbound call carries it.
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ message, conversationHistory }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as ProxyPayload;
    const text = extractProxyText(data);
    return text && text.trim().length > 0 ? { text } : null;
  } catch {
    // Timeout, network error, malformed JSON — all fall back to the engine.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rateLimitResult = checkRateLimit(ip, CHATBOT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json(
        { error: "Message too long (max 500 characters)" },
        { status: 400 }
      );
    }

    let reply: ChatMessage;

    const proxied = await proxyToUpstream(
      trimmed,
      Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : []
    );
    if (proxied) {
      reply = buildBotMessage(proxied.text);
    } else {
      // Rule-based engine — always available, zero external dependencies.
      const delay = 100 + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
      const { content, quickReplies } = generateResponse(trimmed);
      reply = buildBotMessage(content, quickReplies);
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      { message: fallbackMessage() },
      { status: 200 } // UI renders the fallback instead of throwing
    );
  }
}
