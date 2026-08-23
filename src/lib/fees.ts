/**
 * Property fee calculation domain model.
 * All fee calculations MUST go through this module — never trust frontend calculations.
 */

export interface FeeBreakdown {
  /** Monthly rent in UGX */
  rent: number;
  /** Number of months of rent due upfront */
  minimumMonths: number;
  /** Rent × minimumMonths */
  rentSubtotal: number;
  /** Optional security deposit */
  deposit: number;
  /** Agency fee (agents only) */
  agencyFee: number;
  /** 5% service charge on monthly rent */
  serviceCharge: number;
  /** Total move-in cost */
  totalMoveInCost: number;
  /** Payment methods accepted */
  paymentMethods: string[];
  /** Currency */
  currency: "UGX";
}

export interface FeeConfig {
  monthlyRent: number;
  deposit?: number | null;
  agencyFee?: number | null;
  serviceCharge?: number | null;
  minimumMonths?: number;
  paymentMethods?: string[];
  /** Whether the property is listed by an agent */
  isAgentListing?: boolean;
  /** Whether the user is an agent */
  userRole?: string;
}

/** Default minimum months for rent payment */
const DEFAULT_MINIMUM_MONTHS = 1;

/** Service charge percentage */
const SERVICE_CHARGE_RATE = 0.05; // 5%

/** Available payment methods in Uganda */
export const PAYMENT_METHODS = [
  { id: "mobile_money_mtn", label: "MTN Mobile Money" },
  { id: "mobile_money_airtel", label: "Airtel Money" },
  { id: "bank_transfer", label: "Bank Transfer" },
  { id: "cash", label: "Cash" },
] as const;

/**
 * Calculate property fees from a configuration.
 * This is the authoritative backend calculation — frontend must not duplicate.
 */
export function calculatePropertyFees(config: FeeConfig): FeeBreakdown {
  const monthlyRent = Math.max(0, Math.round(config.monthlyRent));
  const minimumMonths = Math.max(1, config.minimumMonths || DEFAULT_MINIMUM_MONTHS);
  const rentSubtotal = monthlyRent * minimumMonths;

  // Deposit is optional — landlord controls whether it's required
  const deposit = Math.max(0, Math.round(config.deposit ?? 0));

  // Agency fee is only valid for agent listings
  const isAgent = config.isAgentListing || config.userRole === "AGENT";
  const agencyFee = isAgent ? Math.max(0, Math.round(config.agencyFee ?? 0)) : 0;

  // Service charge is always 5% of monthly rent
  const serviceCharge = Math.round(monthlyRent * SERVICE_CHARGE_RATE);

  const totalMoveInCost = rentSubtotal + deposit + agencyFee + serviceCharge;

  return {
    rent: monthlyRent,
    minimumMonths,
    rentSubtotal,
    deposit,
    agencyFee,
    serviceCharge,
    totalMoveInCost,
    paymentMethods: config.paymentMethods || [],
    currency: "UGX",
  };
}

/**
 * Get fee breakdown for a property from database values.
 */
export function calculatePropertyFeesFromProperty(property: {
  rent: number;
  deposit?: number | null;
  agencyFee?: number | null;
  serviceCharge?: number | null;
  paymentFrequency?: string;
  /** Landlord-chosen minimum months; takes precedence over paymentFrequency when valid. */
  minimumMonths?: number | null;
  isAgentListing?: boolean;
}): FeeBreakdown {
  const storedMinimumMonths =
    property.minimumMonths && Number.isFinite(property.minimumMonths) && property.minimumMonths > 0
      ? Math.min(12, Math.round(property.minimumMonths))
      : undefined;

  return calculatePropertyFees({
    monthlyRent: property.rent,
    deposit: property.deposit,
    agencyFee: property.agencyFee,
    // Use the stored serviceCharge if provided, but always recalculate
    // to ensure consistency with the 5% rule
    minimumMonths: storedMinimumMonths
      ? storedMinimumMonths
      : property.paymentFrequency === "ANNUALLY" ? 12
        : property.paymentFrequency === "QUARTERLY" ? 3
          : property.paymentFrequency === "MONTHLY" ? 1
            : property.paymentFrequency === "WEEKLY" ? 4
              : 1,
    isAgentListing: property.isAgentListing,
  });
}

/**
 * Validate fee configuration.
 * Returns null if valid, or an error message.
 */
export function validateFeeConfig(config: {
  rent?: number;
  deposit?: number;
  agencyFee?: number;
  minimumMonths?: number;
  isAgentListing?: boolean;
}): string | null {
  if (config.rent !== undefined && config.rent < 1000) {
    return "Rent must be at least UGX 1,000";
  }

  if (config.deposit !== undefined && config.deposit < 0) {
    return "Deposit cannot be negative";
  }

  if (config.agencyFee !== undefined && config.agencyFee < 0) {
    return "Agency fee cannot be negative";
  }

  if (config.agencyFee && config.agencyFee > 0 && !config.isAgentListing) {
    return "Agency fee can only be set for agent listings";
  }

  if (config.minimumMonths !== undefined) {
    if (config.minimumMonths < 1 || config.minimumMonths > 12) {
      return "Minimum months must be between 1 and 12";
    }
  }

  return null;
}
