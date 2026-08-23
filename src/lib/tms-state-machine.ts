/**
 * Tenant Management System — State Machine
 *
 * Enforces valid state transitions for:
 * - Tenancy lifecycle
 * - Lease lifecycle
 * - Maintenance request lifecycle
 * - Application → Tenancy conversion
 * - Renewal lifecycle
 *
 * Invalid transitions throw a descriptive error that the API layer
 * can surface as a 400/409.
 */

// ─── Tenancy States ─────────────────────────────────────

type TenancyStatus =
  | "PENDING"
  | "ACTIVE"
  | "NOTICE_GIVEN"
  | "MOVE_OUT_SCHEDULED"
  | "ENDED"
  | "TERMINATED";

const TENANCY_TRANSITIONS: Record<TenancyStatus, TenancyStatus[]> = {
  PENDING: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["NOTICE_GIVEN", "TERMINATED"],
  NOTICE_GIVEN: ["MOVE_OUT_SCHEDULED", "ACTIVE", "TERMINATED"],
  MOVE_OUT_SCHEDULED: ["ENDED", "TERMINATED"],
  ENDED: [], // terminal
  TERMINATED: [], // terminal
};

export function canTransitionTenancy(from: TenancyStatus, to: TenancyStatus): boolean {
  return TENANCY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTenancyTransition(from: TenancyStatus, to: TenancyStatus): void {
  if (!canTransitionTenancy(from, to)) {
    throw new Error(
      `Cannot transition tenancy from ${from} to ${to}. Valid transitions: ${TENANCY_TRANSITIONS[from].join(", ") || "none (terminal state)"}`
    );
  }
}

// ─── Lease States ───────────────────────────────────────

type LeaseStatus =
  | "DRAFT"
  | "PENDING_SIGNATURE"
  | "ACTIVE"
  | "EXPIRING"
  | "RENEWAL_PENDING"
  | "EXPIRED"
  | "TERMINATED";

const LEASE_TRANSITIONS: Record<LeaseStatus, LeaseStatus[]> = {
  DRAFT: ["PENDING_SIGNATURE", "TERMINATED"],
  PENDING_SIGNATURE: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["EXPIRING", "RENEWAL_PENDING", "EXPIRED", "TERMINATED"],
  EXPIRING: ["RENEWAL_PENDING", "EXPIRED", "TERMINATED"],
  RENEWAL_PENDING: ["ACTIVE", "EXPIRED", "TERMINATED"],
  EXPIRED: [], // terminal
  TERMINATED: [], // terminal
};

export function canTransitionLease(from: LeaseStatus, to: LeaseStatus): boolean {
  return LEASE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertLeaseTransition(from: LeaseStatus, to: LeaseStatus): void {
  if (!canTransitionLease(from, to)) {
    throw new Error(
      `Cannot transition lease from ${from} to ${to}. Valid transitions: ${LEASE_TRANSITIONS[from].join(", ") || "none (terminal state)"}`
    );
  }
}

// ─── Maintenance States ─────────────────────────────────

type MaintenanceStatus =
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_PARTS"
  | "WAITING_FOR_TENANT"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  SUBMITTED: ["ACKNOWLEDGED", "CANCELLED"],
  ACKNOWLEDGED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_PARTS", "WAITING_FOR_TENANT", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_PARTS", "WAITING_FOR_TENANT", "RESOLVED", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"],
  WAITING_FOR_TENANT: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"], // reopen if tenant disputes
  CLOSED: [], // terminal
  CANCELLED: [], // terminal
};

export function canTransitionMaintenance(
  from: MaintenanceStatus,
  to: MaintenanceStatus
): boolean {
  return MAINTENANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertMaintenanceTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus
): void {
  if (!canTransitionMaintenance(from, to)) {
    throw new Error(
      `Cannot transition maintenance from ${from} to ${to}. Valid transitions: ${MAINTENANCE_TRANSITIONS[from].join(", ") || "none (terminal state)"}`
    );
  }
}

// ─── Application States ─────────────────────────────────

type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "SHORTLISTED"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED";

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN", "EXPIRED"],
  UNDER_REVIEW: ["SHORTLISTED", "APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED", "WITHDRAWN"],
  ADDITIONAL_INFORMATION_REQUIRED: ["UNDER_REVIEW", "WITHDRAWN", "EXPIRED"],
  SHORTLISTED: ["APPROVED", "REJECTED", "WITHDRAWN"],
  APPROVED: [], // converted to tenancy
  REJECTED: [], // terminal
  WITHDRAWN: [], // terminal
  EXPIRED: [], // terminal
};

export function canTransitionApplication(
  from: ApplicationStatus,
  to: ApplicationStatus
): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus
): void {
  if (!canTransitionApplication(from, to)) {
    throw new Error(
      `Cannot transition application from ${from} to ${to}. Valid transitions: ${APPLICATION_TRANSITIONS[from].join(", ") || "none (terminal state)"}`
    );
  }
}

// ─── Renewal States ─────────────────────────────────────

type RenewalStatus = "OFFERED" | "TENANT_REVIEWING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

const RENEWAL_TRANSITIONS: Record<RenewalStatus, RenewalStatus[]> = {
  OFFERED: ["TENANT_REVIEWING", "DECLINED", "EXPIRED"],
  TENANT_REVIEWING: ["ACCEPTED", "DECLINED", "EXPIRED"],
  ACCEPTED: [], // terminal — triggers lease creation
  DECLINED: [], // terminal
  EXPIRED: [], // terminal
};

export function canTransitionRenewal(from: RenewalStatus, to: RenewalStatus): boolean {
  return RENEWAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRenewalTransition(from: RenewalStatus, to: RenewalStatus): void {
  if (!canTransitionRenewal(from, to)) {
    throw new Error(
      `Cannot transition renewal from ${from} to ${to}. Valid transitions: ${RENEWAL_TRANSITIONS[from].join(", ") || "none (terminal state)"}`
    );
  }
}

// ─── Unit States ────────────────────────────────────────

type UnitStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE" | "UNAVAILABLE";

const UNIT_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  AVAILABLE: ["RESERVED", "MAINTENANCE", "UNAVAILABLE"],
  RESERVED: ["OCCUPIED", "AVAILABLE", "MAINTENANCE", "UNAVAILABLE"],
  OCCUPIED: ["MAINTENANCE", "RESERVED", "UNAVAILABLE"], // RESERVED = turnover
  MAINTENANCE: ["AVAILABLE", "RESERVED", "OCCUPIED", "UNAVAILABLE"],
  UNAVAILABLE: ["AVAILABLE", "MAINTENANCE"],
};

export function canTransitionUnit(from: UnitStatus, to: UnitStatus): boolean {
  return UNIT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertUnitTransition(from: UnitStatus, to: UnitStatus): void {
  if (!canTransitionUnit(from, to)) {
    throw new Error(
      `Cannot transition unit from ${from} to ${to}. Valid transitions: ${UNIT_TRANSITIONS[from].join(", ") || "none (terminal state)"}`
    );
  }
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Determine the next tenancy status given that a move-out record is completed.
 */
export function tenancyAfterMoveOut(currentStatus: TenancyStatus): TenancyStatus {
  if (currentStatus === "MOVE_OUT_SCHEDULED") return "ENDED";
  if (currentStatus === "NOTICE_GIVEN") return "ENDED";
  return currentStatus;
}

/**
 * Determine the next tenancy status given that a move-in record is completed.
 */
export function tenancyAfterMoveIn(currentStatus: TenancyStatus): TenancyStatus {
  if (currentStatus === "PENDING") return "ACTIVE";
  return currentStatus;
}

/**
 * Auto-expire leases past their end date.
 */
export function shouldExpireLease(endDate: Date, status: LeaseStatus): boolean {
  const now = new Date();
  return (
    now > endDate &&
    (status === "ACTIVE" || status === "EXPIRING" || status === "RENEWAL_PENDING")
  );
}

/**
 * Auto-expire tenancies past their move-out date.
 */
export function shouldExpireTenancy(moveOutDate: Date | null, status: TenancyStatus): boolean {
  if (!moveOutDate) return false;
  const now = new Date();
  return now > moveOutDate && (status === "ACTIVE" || status === "NOTICE_GIVEN");
}
