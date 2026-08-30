/**
 * Centralized brand constants for Rent Mesh.
 *
 * All customer-facing strings live here so a single edit propagates everywhere.
 * Internal identifiers (env vars, database columns, API namespaces) are NOT
 * changed — only the presentation layer references this module.
 */

export const BRAND = {
  /** Full product name (customer-facing) */
  name: "Rent Mesh",
  /** Short name for PWA manifest, mobile tabs, etc. */
  shortName: "Rent Mesh",
  /** Tagline */
  tagline: "Find your place in Kampala.",
  /** SEO description */
  description:
    "Rent Mesh is Uganda's trusted rental housing marketplace. Find houses, apartments, and rooms for rent in Kampala, Wakiso, Mukono, and across Uganda.",
  /** OG site name */
  siteName: "Rent Mesh",
  /** Canonical domain — do NOT change for DNS */
  domain: "rentme.ug",
  /** Email display name (preserves sender address) */
  emailDisplayName: "Rent Mesh",
  /** Copyright holder line */
  copyright: "Rent Mesh Uganda",
  /** Support chatbot welcome */
  chatbotWelcome: "Hello! 👋 Welcome to Rent Mesh Support. How can I help you today?",
  /** Safe mode label used in flagging messages */
  safeLabel: "Rent Mesh",
} as const;

/**
 * Color palette extracted from Rentmesh.png
 *
 * Source image: 1254×1254 RGBA PNG
 * Content bounding box: (138, 53, 1065, 1069)
 *
 * Primary navy (building body):  #022b59  rgb(2, 43, 89)
 * Teal accent (network nodes):   #12a59c  rgb(18, 165, 156)
 * Bright teal (highlights):      #00fefe  rgb(0, 254, 254)
 * Deep navy (shadows):           #001960  rgb(0, 25, 96)
 */
export const BRAND_COLORS = {
  navy: "#022b59",
  navyDark: "#001960",
  teal: "#12a59c",
  tealBright: "#00fefe",
} as const;
