/**
 * Pure flagging / scam-alert rules (safe for client components).
 * Server-side persistence lives in `@/lib/flagging`.
 */

export const REPORT_REASONS = [
  "SCAM",
  "FAKE_PROPERTY",
  "ALREADY_RENTED",
  "WRONG_PRICE",
  "WRONG_LOCATION",
  "FAKE_PHOTOS",
  "HARASSMENT",
  "DUPLICATE_LISTING",
  "OTHER",
] as const;

export type ReportReasonValue = (typeof REPORT_REASONS)[number];

export type ReportSeverity = "HIGH" | "MEDIUM" | "LOW";

export type SafetyLevel = "none" | "caution" | "warning" | "danger";

export type PropertyStatusValue =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "RENTED"
  | "SUSPENDED"
  | "ARCHIVED";

export interface PublicSafetyAlert {
  level: SafetyLevel;
  title: string;
  messages: string[];
  hideDirectContact: boolean;
  blockInquiries: boolean;
}

export const REPORT_SEVERITY: Record<ReportReasonValue, ReportSeverity> = {
  SCAM: "HIGH",
  FAKE_PROPERTY: "HIGH",
  FAKE_PHOTOS: "HIGH",
  HARASSMENT: "HIGH",
  DUPLICATE_LISTING: "MEDIUM",
  WRONG_LOCATION: "MEDIUM",
  ALREADY_RENTED: "MEDIUM",
  WRONG_PRICE: "LOW",
  OTHER: "LOW",
};

export const REPORT_REASON_LABELS: Record<ReportReasonValue, string> = {
  SCAM: "Scam / fraud",
  FAKE_PROPERTY: "Fake property",
  ALREADY_RENTED: "Already rented",
  WRONG_PRICE: "Wrong price",
  WRONG_LOCATION: "Wrong location",
  FAKE_PHOTOS: "Fake or stolen photos",
  HARASSMENT: "Harassment",
  DUPLICATE_LISTING: "Duplicate listing",
  OTHER: "Other",
};

export const HIGH_SEVERITY_REASONS: ReportReasonValue[] = REPORT_REASONS.filter(
  (reason) => REPORT_SEVERITY[reason] === "HIGH"
);

/** One high-severity report is enough to show a public caution banner. */
export const FLAG_ALERT_THRESHOLD = 1;

/** Independent SCAM reports that take the listing out of search. */
export const SCAM_SUSPEND_THRESHOLD = 2;

/** Independent high-severity reports that take the listing out of search. */
export const HIGH_SEVERITY_SUSPEND_THRESHOLD = 3;

const SCAM_PATTERNS: RegExp[] = [
  /western\s*union/i,
  /money\s*gram/i,
  /pay\s+(before|prior to)\s+(view|visit|seeing)/i,
  /send\s+(money|payment|deposit)\s+(first|before|now)/i,
  /booking\s+fee\s+before/i,
  /reservation\s+fee/i,
  /holding\s+(fee|deposit)\s+before/i,
  /i('?m| am)\s+(currently\s+)?(abroad|overseas|out of (the )?country)/i,
  /not\s+in\s+uganda/i,
  /whatsapp\s+only/i,
  /send\s+(mtn|airtel)\s*(money)?\s*(first|before)/i,
  /agent\s+fee\s+(in\s+advance|before)/i,
  /pay\s+to\s+reserve/i,
];

const CHEAP_TYPES = new Set(["single_room", "hostel", "bedsitter", "room_self_contained"]);

export function isReportReason(value: unknown): value is ReportReasonValue {
  return typeof value === "string" && (REPORT_REASONS as readonly string[]).includes(value);
}

export function reportSeverity(reason: ReportReasonValue): ReportSeverity {
  return REPORT_SEVERITY[reason];
}

export function descriptionRequired(reason: ReportReasonValue): boolean {
  return reason === "OTHER" || REPORT_SEVERITY[reason] === "HIGH";
}

export function minDescriptionLength(reason: ReportReasonValue): number {
  if (reason === "OTHER") return 20;
  if (REPORT_SEVERITY[reason] === "HIGH") return 10;
  return 0;
}

export function detectScamSignals(input: {
  description: string;
  rent: number;
  bedrooms: number;
  propertyType: string;
  imageCount: number;
  isVerified: boolean;
  ownerVerified: boolean;
  ownerCreatedAt: Date;
  listedAt: Date;
}): string[] {
  const signals: string[] = [];
  const now = Date.now();
  const accountAgeDays = (now - input.ownerCreatedAt.getTime()) / 86_400_000;
  const listingAgeHours = (now - input.listedAt.getTime()) / 3_600_000;

  if (SCAM_PATTERNS.some((pattern) => pattern.test(input.description))) {
    signals.push("Listing copy matches common rental-scam language");
  }

  if (input.imageCount === 0) {
    signals.push("No photos on the listing");
  }

  if (!input.isVerified && !input.ownerVerified && accountAgeDays < 7 && listingAgeHours < 72) {
    signals.push("New unverified account with a very recent listing");
  }

  const isCheapType = CHEAP_TYPES.has(input.propertyType);
  if (!isCheapType && input.bedrooms >= 2 && input.rent > 0 && input.rent < 150_000) {
    signals.push("Rent is unusually low for this property size");
  } else if (!isCheapType && input.bedrooms >= 1 && input.rent > 0 && input.rent < 50_000) {
    signals.push("Rent is unusually low for this property type");
  }

  return signals;
}

export function buildPublicSafetyAlert(input: {
  isFlagged: boolean;
  flagReason: string | null;
  status: PropertyStatusValue;
  isVerified: boolean;
  imageCount: number;
  rent: number;
  bedrooms: number;
  propertyType: string;
  description: string;
  listedAt: Date;
  ownerCreatedAt: Date;
  ownerVerified: boolean;
  isOwner: boolean;
}): PublicSafetyAlert {
  const suspended = input.status === "SUSPENDED";
  const signals = detectScamSignals(input);
  const reasonLabel =
    input.flagReason && isReportReason(input.flagReason)
      ? REPORT_REASON_LABELS[input.flagReason]
      : null;

  if (input.isOwner) {
    if (suspended) {
      return {
        level: "danger",
        title: "Your listing is suspended",
        messages: [
          "Rent Mesh hid this listing from search after reports or a safety review.",
          "Update the listing with accurate details and contact support if you believe this was a mistake.",
        ],
        hideDirectContact: false,
        blockInquiries: true,
      };
    }
    if (input.isFlagged) {
      return {
        level: "warning",
        title: "Your listing is under review",
        messages: [
          reasonLabel
            ? `Someone reported this listing for: ${reasonLabel.toLowerCase()}.`
            : "Someone reported this listing. Our team is reviewing it.",
          "It stays visible for now. Repeat reports can hide it from search.",
        ],
        hideDirectContact: false,
        blockInquiries: false,
      };
    }
    return {
      level: "none",
      title: "",
      messages: [],
      hideDirectContact: false,
      blockInquiries: false,
    };
  }

  if (suspended) {
    return {
      level: "danger",
      title: "Scam alert — this listing is not available",
      messages: [
        "This listing was taken down after safety reports. Do not send money or share personal documents.",
        "If you were already in contact, stop payment and report the conversation.",
      ],
      hideDirectContact: true,
      blockInquiries: true,
    };
  }

  if (input.isFlagged) {
    return {
      level: "warning",
      title: "Scam alert",
      messages: [
        reasonLabel
          ? `This listing was reported for ${reasonLabel.toLowerCase()}. Treat it with extra caution.`
          : "This listing has been reported. Treat it with extra caution.",
        "Never pay a deposit, booking fee, or agent fee before viewing the property in person.",
        "Keep the conversation on Rent Mesh so there is a record if something goes wrong.",
      ],
      hideDirectContact: true,
      blockInquiries: false,
    };
  }

  if (signals.length >= 2) {
    return {
      level: "caution",
      title: "Stay cautious with this listing",
      messages: [
        ...signals.slice(0, 3),
        "Visit in person before paying, and use Rent Mesh messages instead of off-platform payment requests.",
      ],
      hideDirectContact: false,
      blockInquiries: false,
    };
  }

  return {
    level: "none",
    title: "",
    messages: [],
    hideDirectContact: false,
    blockInquiries: false,
  };
}
