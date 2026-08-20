"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Send, Image, MoreVertical, Flag } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { formatUGX, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

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

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll for new messages
    return () => clearInterval(interval);
  }, [params.id]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/conversations/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      }
    } catch (error) {
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
              <p className="text-sm font-semibold text-gray-900">{other?.name || "Unknown"}</p>
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
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="page-container max-w-2xl mx-auto space-y-4">
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
                    <p className="text-sm leading-relaxed">{msg.content}</p>
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
              className="input flex-1"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="btn-primary p-2.5"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
