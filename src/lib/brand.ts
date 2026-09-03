/**
 * Centralized brand constants for Modern Properties.
 *
 * All customer-facing strings live here so a single edit propagates everywhere.
 * Internal identifiers (env vars, database columns, API namespaces, role
 * values) are NOT changed — only the presentation layer references this module.
 */

export const brand = {
  name: "Modern Properties",
  shortName: "Modern Properties",
  tagline: "Your Sure Property Solution",
  description:
    "Discover property, land, vehicles, products and services across Uganda.",
  currentDomain: "rentme.rest",
  websiteUrl: "https://rentme.rest",
} as const;

/**
 * Legacy BRAND export kept for backward compatibility across the codebase.
 * New code should import `brand` instead.
 */
export const BRAND = {
  /** Full product name (customer-facing) */
  name: brand.name,
  /** Short name for PWA manifest, mobile tabs, etc. */
  shortName: brand.shortName,
  /** Tagline */
  tagline: brand.tagline,
  /** SEO description */
  description: brand.description,
  /** OG site name */
  siteName: brand.name,
  /** Canonical domain — do NOT change for DNS */
  domain: brand.currentDomain,
  /** Email display name (preserves sender address) */
  emailDisplayName: brand.name,
  /** Website URL */
  websiteUrl: brand.websiteUrl,
  /** Copyright holder line */
  copyright: "Modern Properties Uganda",
  /** Support chatbot welcome */
  chatbotWelcome: `Hello! 👋 Welcome to ${brand.name} Support. How can I help you today?`,
  /** Safe mode label used in flagging messages */
  safeLabel: brand.name,
} as const;

/**
 * User-facing role labels.
 *
 * Internal persisted role values (tenant, landlord, agent) must remain
 * unchanged in the database, tokens, sessions and authorization policies.
 * This mapping is used ONLY for presentation.
 */
export const roleLabels: Record<string, string> = {
  tenant: "Client",
  landlord: "Owner",
  agent: "Agent",
  admin: "Admin",
  TENANT: "Client",
  LANDLORD: "Owner",
  AGENT: "Agent",
  ADMIN: "Admin",
} as const;

/** Supported listing categories (universal marketplace taxonomy). */
export const LISTING_CATEGORIES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "land", label: "Land" },
  { value: "agricultural", label: "Agricultural" },
  { value: "vehicle", label: "Vehicles" },
  { value: "equipment", label: "Equipment" },
  { value: "product", label: "Products" },
  { value: "service", label: "Services" },
] as const;

/** Supported transaction types. */
export const TRANSACTION_TYPES = [
  { value: "rent", label: "Rent" },
  { value: "sale", label: "Sale" },
  { value: "lease", label: "Lease" },
  { value: "hire", label: "Hire" },
  { value: "service", label: "Service" },
  { value: "request", label: "Request" },
] as const;

/**
 * Category-specific subtypes shown in the search/listing forms.
 * Kept as a maintainable dataset rather than embedding each subtype in UI.
 */
export const CATEGORY_SUBTYPES: Record<string, Array<{ value: string; label: string }>> = {
  residential: [
    { value: "house", label: "House" },
    { value: "apartment", label: "Apartment" },
    { value: "bedsitter", label: "Bedsitter" },
    { value: "studio", label: "Studio" },
    { value: "flat", label: "Flat" },
    { value: "villa", label: "Villa" },
    { value: "townhouse", label: "Townhouse" },
    { value: "room", label: "Room" },
    { value: "hostel", label: "Hostel" },
  ],
  commercial: [
    { value: "office", label: "Office" },
    { value: "shop", label: "Shop" },
    { value: "retail", label: "Retail Space" },
    { value: "boutique", label: "Boutique" },
    { value: "warehouse_retail", label: "Warehouse & Retail" },
    { value: "hotel", label: "Hotel" },
    { value: "restaurant", label: "Restaurant" },
  ],
  industrial: [
    { value: "factory", label: "Factory" },
    { value: "warehouse", label: "Warehouse" },
    { value: "workshop", label: "Workshop" },
    { value: "plant", label: "Plant" },
    { value: "yard", label: "Industrial Yard" },
  ],
  land: [
    { value: "plot", label: "Plot" },
    { value: "parcel", label: "Land Parcel" },
    { value: "commercial_land", label: "Commercial Land" },
    { value: "residential_land", label: "Residential Land" },
    { value: "agricultural_land", label: "Agricultural Land" },
  ],
  agricultural: [
    { value: "farm", label: "Farm" },
    { value: "plantation", label: "Plantation" },
    { value: "ranch", label: "Ranch" },
    { value: "poultry", label: "Poultry" },
  ],
  vehicle: [
    { value: "car", label: "Car" },
    { value: "motorcycle", label: "Motorcycle" },
    { value: "truck", label: "Truck" },
    { value: "bus", label: "Bus" },
    { value: "van", label: "Van" },
    { value: "pickup", label: "Pickup" },
    { value: "trailer", label: "Trailer" },
  ],
  equipment: [
    { value: "machinery", label: "Machinery" },
    { value: "construction", label: "Construction Equipment" },
    { value: "agricultural_equipment", label: "Agricultural Equipment" },
    { value: "tractor", label: "Tractor" },
  ],
  product: [
    { value: "furniture", label: "Furniture" },
    { value: "appliance", label: "Appliance" },
    { value: "electronics", label: "Electronics" },
    { value: "materials", label: "Building Materials" },
  ],
  service: [
    { value: "property_management", label: "Property Management" },
    { value: "maintenance", label: "Maintenance Services" },
    { value: "brokerage", label: "Brokerage & Agent Services" },
    { value: "professional", label: "Professional Services" },
    { value: "cleaning", label: "Cleaning Services" },
    { value: "transport", label: "Transport Services" },
  ],
};

/**
 * Category-specific fallback images.
 * Used when a listing has no image or as a placeholder during loading.
 * No house placeholder is used for land, vehicles or services.
 */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  residential:
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=75&auto=format",
  commercial:
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=75&auto=format",
  industrial:
    "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800&q=75&auto=format",
  land:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=75&auto=format",
  agricultural:
    "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=75&auto=format",
  vehicle:
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=75&auto=format",
  equipment:
    "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&q=75&auto=format",
  product:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=75&auto=format",
  service:
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=75&auto=format",
};

/** Fallback used when category is unknown. */
export const DEFAULT_CATEGORY_FALLBACK_IMAGE = CATEGORY_FALLBACK_IMAGES.residential;

/**
 * Get the appropriate fallback image for a listing category.
 */
export function categoryFallbackImage(category?: string | null): string {
  if (category && CATEGORY_FALLBACK_IMAGES[category]) {
    return CATEGORY_FALLBACK_IMAGES[category];
  }
  return DEFAULT_CATEGORY_FALLBACK_IMAGE;
}

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
