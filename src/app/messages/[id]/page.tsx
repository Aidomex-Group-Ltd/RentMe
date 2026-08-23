"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { timeAgo } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Real-time message thread.
 *
 * Transport: EventSource (SSE) on a RELATIVE url — the host is discovered
 * dynamically from the page origin; no hardcoded endpoints. Falls back to
 * 5s HTTP polling when the stream fails or the browser lacks EventSource.
 * All timers/streams are cleaned up on unmount and paused when hidden.
 */
export default function MessagePage() {
  const params = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Latest messages kept in a ref so SSE/polling handlers can dedupe
  // without re-triggering effects.
  const messagesRef = useRef<any[]>([]);
  const setBoth = (updater: (prev: any[]) => any[]) => {
    messagesRef.current = updater(messagesRef.current);
    setMessages(messagesRef.current);
  };

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let source: EventSource | null = null;
    let disposed = false;

    async function initialFetch() {
      try {
        // Single round-trip returns history + conversation metadata.
        const res = await fetch(`/api/conversations/${params.id}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (disposed) return;
        messagesRef.current = data.messages || [];
        setMessages(messagesRef.current);
        setConversation(data.conversation || null);
      } catch {
        if (!disposed) toast.error("Failed to load messages");
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        if (document.hidden) return; // pause background polling
        try {
          const res = await fetch(`/api/conversations/${params.id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (disposed) return;
          messagesRef.current = data.messages || [];
          setMessages(messagesRef.current);
          if (data.conversation) setConversation(data.conversation);
        } catch {
          /* transient — next tick retries */
        }
      }, 5000);
    }

    function startStream() {
      if (typeof window === "undefined" || typeof EventSource === "undefined") {
        startPolling();
        return;
      }
      try {
        // Relative URL → dynamic same-origin discovery. Cursor = newest
        // known timestamp so only genuinely new messages arrive.
        const last = messagesRef.current[messagesRef.current.length - 1];
        source = new EventSource(
          `/api/conversations/${params.id}/stream${
            last?.createdAt ? `?after=${encodeURIComponent(last.createdAt)}` : ""
          }`
        );
        source.addEventListener("message", (ev) => {
          try {
            const msg = JSON.parse((ev as MessageEvent).data);
            setBoth((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          } catch {
            /* malformed frame ignored */
          }
        });
        source.addEventListener("error", () => {
          // Stream lost (network drop / server restart) → degrade to polling.
          if (source) source.close();
          source = null;
          startPolling();
        });
      } catch {
        startPolling();
      }
    }

    initialFetch().then(() => {
      if (!disposed) startStream();
    });

    return () => {
      disposed = true;
      if (source) source.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setBoth((prev) =>
          prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
        );
        setNewMessage("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to send (${res.status})`);
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const other = conversation?.participants?.find(
    (p: any) => p.userId !== session?.user?.id
  )?.user;

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-50 pb-14 md:pb-0">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white px-4 py-3">
          <div className="page-container flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-sm font-semibold">
              {other?.name?.[0] || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{other?.name || "…"}</p>
              <p className="text-xs text-gray-500 truncate">
                {conversation?.property?.title}
              </p>
            </div>
            <Link
              href={conversation?.property ? `/properties/${conversation.property.id}` : "#"}
              className="text-xs text-brand-600 hover:underline"
            >
              View Property
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          <div className="page-container max-w-2xl mx-auto space-y-4">
            {loading && (
              <div className="space-y-3" data-testid="messages-loading">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 w-2/3 animate-pulse rounded-2xl bg-gray-200" />
                ))}
              </div>
            )}
            {!loading && messages.length === 0 && (
              <p className="pt-8 text-center text-sm text-gray-400">
                No messages yet — say hello 👋
              </p>
            )}
            {messages.map((msg: any) => {
              const isOwn = msg.senderId === session?.user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? "bg-brand-500 text-white rounded-br-sm"
                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`mt-1 text-xs ${isOwn ? "text-white/60" : "text-gray-400"}`}>
                      {timeAgo(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <form onSubmit={handleSend} className="page-container max-w-2xl mx-auto flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              maxLength={5000}
              className="input flex-1"
              disabled={sending}
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="btn-primary p-2.5"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
