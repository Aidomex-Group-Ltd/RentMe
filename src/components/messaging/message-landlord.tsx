"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface MessageLandlordProps {
  propertyId: string;
  landlordId: string;
  landlordName?: string;
  className?: string;
  label?: string;
}

/**
 * Contact entry point for a property listing.
 * Starts (or reuses) a conversation with the listing owner, sends any
 * pre-filled message, then navigates to the message thread.
 *
 * All API calls are relative — host is discovered dynamically from origin.
 */
export function MessageLandlord({
  propertyId,
  landlordId,
  landlordName,
  className,
  label,
}: MessageLandlordProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const handleContact = async () => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, recipientId: landlordId }),
      });
      const data = await res.json();
      if (!res.ok || !data.conversation) {
        toast.error(data.error || "Failed to start conversation");
        return;
      }
      if (messageText.trim()) {
        const sendRes = await fetch(`/api/conversations/${data.conversation.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: messageText.trim() }),
        });
        if (!sendRes.ok) {
          const err = await sendRes.json().catch(() => ({}));
          toast.error(err.error || "Failed to send message");
          return;
        }
      }
      toast.success(`Message sent to ${landlordName || "landlord"}`);
      router.push(`/messages/${data.conversation.id}`);
    } catch {
      toast.error("Failed to start conversation");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={className}>
      <textarea
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        placeholder={`Ask about this property${landlordName ? ` — ${landlordName} typically replies within a day` : ""}`}
        rows={3}
        maxLength={5000}
        className="input w-full resize-none"
        aria-label="Message to landlord"
      />
      <button
        onClick={handleContact}
        disabled={sending}
        className="btn-primary mt-2 flex w-full items-center justify-center gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        {sending ? "Sending…" : label || "Message Landlord"}
      </button>
    </div>
  );
}

export default MessageLandlord;
