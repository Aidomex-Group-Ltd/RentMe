"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, Home } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { timeAgo } from "@/lib/utils";

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchConversations();
    }
  }, [status]);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="bg-white border-b border-gray-100">
          <div className="page-container py-4">
            <h1 className="text-xl font-bold text-gray-900 font-display">Messages</h1>
          </div>
        </div>

        <div className="page-container py-4">
          <div className="card divide-y divide-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-1/3" />
                      <div className="skeleton h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conv: any) => {
                const other = conv.participants?.find(
                  (p: any) => p.userId !== session?.user?.id
                )?.user;
                return (
                  <Link
                    key={conv.id}
                    href={`/messages/${conv.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-semibold">
                      {other?.name?.[0] || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{other?.name || "Unknown"}</p>
                        <p className="text-xs text-gray-400">
                          {conv.messages?.[0] ? timeAgo(conv.messages[0].createdAt) : ""}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conv.property?.title} — {conv.property?.district}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {conv.messages?.[0]?.content || "No messages yet"}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No conversations yet</h3>
                <p className="mt-1 text-gray-500">
                  When you contact a landlord or agent, your conversations will appear here.
                </p>
                <Link href="/search" className="btn-primary mt-4 inline-flex text-sm">
                  Browse Properties
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
