/**
 * Support Chatbot Engine (Stage 7).
 *
 * Rule-based intent detection and response generation shared by both
 * chatbot routes (/api/chatbot and /api/chatbot/message). The message
 * route may additionally proxy to an upstream LLM when server-only
 * credentials are configured; this engine is always the fallback so a
 * failing backend call degrades gracefully instead of erroring the UI.
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  quickReplies?: string[];
}

/** Quick reply categories with their responses */
export const QUICK_REPLIES: Record<
  string,
  { label: string; response: string; followUp?: string[] }
> = {
  "Property Listing": {
    label: "Property Listing",
    response:
      'To list a property on Rent Mesh:\n\n1. Create an account as a landlord or agent\n2. Go to your dashboard and click "List Property"\n3. Fill in property details, photos, and pricing\n4. Submit for review — it typically takes 24 hours\n\nNeed help with a specific step?',
    followUp: ["How to add photos?", "Pricing guidelines", "Verification status"],
  },
  Payments: {
    label: "Payments",
    response:
      "Rent Mesh supports multiple payment methods:\n\n• MTN Mobile Money\n• Airtel Money\n• Bank Transfer\n• Cash\n\nPayment details are agreed between tenant and landlord. Rent Mesh does not process rental payments directly.",
    followUp: ["Security deposit", "Service charges", "Agency fees"],
  },
  Inspections: {
    label: "Inspections",
    response:
      'You can schedule a property inspection through:\n\n1. Open the property listing\n2. Click "Request Viewing"\n3. Select your preferred date and time\n4. The landlord will confirm or suggest alternatives\n\nYou can also use our inspection tracker for navigation assistance.',
    followUp: ["How to use tracker?", "What if landlord doesn't respond?"],
  },
  "Rental Process": {
    label: "Rental Process",
    response:
      "The typical rental process on Rent Mesh:\n\n1. Search for properties\n2. Contact the landlord via messaging\n3. Schedule a viewing\n4. Visit the property in person\n5. Agree on terms and payment\n6. Move in!\n\nAlways visit in person before making any payments.",
    followUp: ["Application process", "What to bring to viewing", "Safety tips"],
  },
  FAQ: {
    label: "FAQ",
    response:
      "Common questions:\n\n• How do I report a scam listing? Use the flag button on any listing.\n• How do I verify my account? Submit ID documents from your dashboard.\n• Can I edit my listing? Yes, from your dashboard.\n• How do I delete my account? Contact support.",
    followUp: ["Report a listing", "Account verification", "Delete account"],
  },
  "Contact Support": {
    label: "Contact Support",
    response:
      "You can reach our support team through:\n\n• In-app messaging (you're here!)\n• Email: support@rentme.ug\n\nOur team typically responds within 24 hours during business days.",
    followUp: ["Report urgent issue", "Feedback"],
  },
};

/** Detect keywords in user messages for rule-based responses */
export function detectIntent(message: string): string | null {
  const lower = message.toLowerCase();

  if (/scam|fraud|fake|stolen/.test(lower)) return "SCAM_REPORT";
  if (/report|flag|suspicious/.test(lower)) return "REPORT";
  if (/photo|image|picture|upload/.test(lower)) return "PHOTOS";
  if (/price|rent|cost|fee|deposit/.test(lower)) return "PRICING";
  if (/view|visit|inspect|tour/.test(lower)) return "INSPECTION";
  if (/pay|payment|mobile money|mtn|airtel/.test(lower)) return "PAYMENT";
  if (/list|create|add|post/.test(lower)) return "LISTING";
  if (/verify|verification|id|document/.test(lower)) return "VERIFICATION";
  if (/cancel|delete|remove/.test(lower)) return "CANCEL";
  if (/hello|hi|hey|good morning|good afternoon/.test(lower)) return "GREETING";
  if (/thank|thanks|appreciate/.test(lower)) return "THANKS";
  if (/help|support|assist/.test(lower)) return "HELP";

  return null;
}

type Generated = { content: string; quickReplies?: string[] };

/**
 * Exact quick-reply labels resolve straight to their canned topic;
 * free text goes through keyword intent detection.
 */
export function generateResponse(message: string): Generated {
  const topic = QUICK_REPLIES[message.trim()];
  if (topic) {
    return { content: topic.response, quickReplies: topic.followUp };
  }

  const intent = detectIntent(message);

  switch (intent) {
    case "GREETING":
      return {
        content:
          "Hello! 👋 Welcome to Rent Mesh Support. I'm here to help you with:\n\n• Finding properties\n• Listing your property\n• Scheduling inspections\n• Payment questions\n• Reporting issues\n\nHow can I assist you today?",
        quickReplies: ["Property Listing", "Payments", "Inspections", "FAQ"],
      };

    case "SCAM_REPORT":
    case "REPORT":
      return {
        content:
          "If you've encountered a suspicious listing:\n\n1. Open the listing\n2. Click the flag icon (🚩)\n3. Select a reason (Scam, Fake Property, etc.)\n4. Add details if possible\n\nOur team reviews reports within 24 hours. High-severity reports may automatically hide the listing.",
        quickReplies: ["Report urgent issue", "Safety tips", "FAQ"],
      };

    case "PHOTOS":
      return {
        content:
          'Adding photos to your listing:\n\n1. Go to your dashboard\n2. Edit your property listing\n3. Click "Add Photos"\n4. Select from gallery or take a photo\n\nTips:\n• Upload clear, well-lit photos\n• Include all rooms\n• Show the exterior\n• Max 8MB per photo, up to 20 photos',
        quickReplies: ["Property Listing", "Pricing guidelines", "FAQ"],
      };

    case "PRICING":
      return {
        content:
          "Pricing on Rent Mesh:\n\n• Set your own monthly rent in UGX\n• Security deposit is optional\n• Agency fee applies only for agent listings\n• Service charge is 5% of monthly rent\n\nAll fees are calculated on the backend — you can review the breakdown before submitting.",
        quickReplies: ["Security deposit", "Service charges", "Agency fees"],
      };

    case "INSPECTION":
      return {
        content:
          'Scheduling a viewing:\n\n1. Open the property listing\n2. Click "Request Viewing"\n3. Choose date and time\n4. Add a message (optional)\n5. Submit the request\n\nThe landlord will confirm or suggest alternatives. You can also use our inspection tracker for navigation.',
        quickReplies: ["How to use tracker?", "What if landlord doesn't respond?", "Safety tips"],
      };

    case "PAYMENT":
      return {
        content:
          "Payment methods on Rent Mesh:\n\n• MTN Mobile Money\n• Airtel Money\n• Bank Transfer\n• Cash\n\n⚠️ Important: Never pay before viewing the property in person. Use Rent Mesh messaging so there's a record.",
        quickReplies: ["Security deposit", "Service charges", "Report scam payment request"],
      };

    case "LISTING":
      return {
        content:
          "Creating a listing:\n\n1. Sign up as a landlord or agent\n2. Go to Dashboard → List Property\n3. Fill in all details across 7 steps\n4. Upload photos (up to 20)\n5. Review and submit\n\nListings go through a review process (typically 24 hours).",
        quickReplies: ["Property Listing", "How to add photos?", "Pricing guidelines"],
      };

    case "VERIFICATION":
      return {
        content:
          'Account verification:\n\n1. Go to your Dashboard\n2. Click "Verify Account"\n3. Upload a valid ID document\n4. Wait for review (1-2 business days)\n\nVerified accounts get a badge and higher trust from tenants.',
        quickReplies: ["Property Listing", "FAQ", "Contact Support"],
      };

    case "THANKS":
      return {
        content: "You're welcome! 😊 Is there anything else I can help you with?",
        quickReplies: ["FAQ", "Contact Support"],
      };

    case "HELP":
      return {
        content:
          "I can help you with:\n\n• **Property Listing** — How to list your property\n• **Payments** — Payment methods and fees\n• **Inspections** — Scheduling and tracking\n• **Rental Process** — End-to-end guide\n• **FAQ** — Common questions\n• **Contact Support** — Reach our team\n\nClick a topic or type your question!",
        quickReplies: [
          "Property Listing",
          "Payments",
          "Inspections",
          "FAQ",
          "Contact Support",
        ],
      };

    default:
      return {
        content:
          "I'm not sure I understand that question. Let me connect you with the right information.\n\nCould you try selecting one of these topics?",
        quickReplies: [
          "Property Listing",
          "Payments",
          "Inspections",
          "Rental Process",
          "FAQ",
          "Contact Support",
        ],
      };
  }
}

export function buildBotMessage(content: string, quickReplies?: string[]): ChatMessage {
  return {
    id: `bot-${Date.now()}`,
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    quickReplies,
  };
}

/** Fallback message used when the engine or an upstream proxy fails. */
export function fallbackMessage(): ChatMessage {
  return {
    id: `bot-error-${Date.now()}`,
    role: "assistant",
    content:
      "I'm sorry, something went wrong. Please try again or contact support at support@rentme.ug.",
    timestamp: new Date().toISOString(),
    quickReplies: ["Contact Support", "FAQ"],
  };
}
