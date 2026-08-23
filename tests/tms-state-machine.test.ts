/**
 * TMS State Machine — Integration Tests
 *
 * Run: npx tsx tests/tms-state-machine.test.ts
 *
 * Tests every state transition for:
 * - Tenancy lifecycle
 * - Lease lifecycle
 * - Maintenance request lifecycle
 * - Application lifecycle
 * - Renewal lifecycle
 * - Unit lifecycle
 *
 * Verifies that valid transitions succeed and invalid ones throw.
 */
import { strict as assert } from "node:assert";
import {
  canTransitionTenancy,
  assertTenancyTransition,
  canTransitionLease,
  assertLeaseTransition,
  canTransitionMaintenance,
  assertMaintenanceTransition,
  canTransitionApplication,
  assertApplicationTransition,
  canTransitionRenewal,
  assertRenewalTransition,
  canTransitionUnit,
  assertUnitTransition,
  tenancyAfterMoveIn,
  tenancyAfterMoveOut,
  shouldExpireLease,
  shouldExpireTenancy,
} from "../src/lib/tms-state-machine";

let passed = 0;
let failed = 0;

function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${(e as Error).message}`);
  }
}

function throws(name: string, fn: () => void) {
  try {
    fn();
    failed++;
    console.error(`✗ ${name} (expected error, none thrown)`);
  } catch {
    passed++;
    console.log(`✓ ${name}`);
  }
}

// ══════════════════════════════════════════════════════════════
// TENANCY TRANSITIONS
// ══════════════════════════════════════════════════════════════

ok("tenancy: PENDING → ACTIVE", () => {
  assert.ok(canTransitionTenancy("PENDING", "ACTIVE"));
});

ok("tenancy: PENDING → TERMINATED", () => {
  assert.ok(canTransitionTenancy("PENDING", "TERMINATED"));
});

throws("tenancy: PENDING → ENDED (invalid)", () => {
  assertTenancyTransition("PENDING", "ENDED");
});

ok("tenancy: ACTIVE → NOTICE_GIVEN", () => {
  assert.ok(canTransitionTenancy("ACTIVE", "NOTICE_GIVEN"));
});

ok("tenancy: ACTIVE → TERMINATED", () => {
  assert.ok(canTransitionTenancy("ACTIVE", "TERMINATED"));
});

throws("tenancy: ACTIVE → PENDING (invalid reverse)", () => {
  assertTenancyTransition("ACTIVE", "PENDING");
});

ok("tenancy: NOTICE_GIVEN → MOVE_OUT_SCHEDULED", () => {
  assert.ok(canTransitionTenancy("NOTICE_GIVEN", "MOVE_OUT_SCHEDULED"));
});

ok("tenancy: NOTICE_GIVEN → ACTIVE (tenant rescinds notice)", () => {
  assert.ok(canTransitionTenancy("NOTICE_GIVEN", "ACTIVE"));
});

ok("tenancy: MOVE_OUT_SCHEDULED → ENDED", () => {
  assert.ok(canTransitionTenancy("MOVE_OUT_SCHEDULED", "ENDED"));
});

throws("tenancy: ENDED → ACTIVE (terminal)", () => {
  assertTenancyTransition("ENDED", "ACTIVE");
});

throws("tenancy: TERMINATED → ACTIVE (terminal)", () => {
  assertTenancyTransition("TERMINATED", "ACTIVE");
});

// ══════════════════════════════════════════════════════════════
// LEASE TRANSITIONS
// ══════════════════════════════════════════════════════════════

ok("lease: DRAFT → PENDING_SIGNATURE", () => {
  assert.ok(canTransitionLease("DRAFT", "PENDING_SIGNATURE"));
});

ok("lease: PENDING_SIGNATURE → ACTIVE", () => {
  assert.ok(canTransitionLease("PENDING_SIGNATURE", "ACTIVE"));
});

ok("lease: ACTIVE → EXPIRING", () => {
  assert.ok(canTransitionLease("ACTIVE", "EXPIRING"));
});

ok("lease: ACTIVE → RENEWAL_PENDING", () => {
  assert.ok(canTransitionLease("ACTIVE", "RENEWAL_PENDING"));
});

ok("lease: ACTIVE → EXPIRED", () => {
  assert.ok(canTransitionLease("ACTIVE", "EXPIRED"));
});

ok("lease: ACTIVE → TERMINATED", () => {
  assert.ok(canTransitionLease("ACTIVE", "TERMINATED"));
});

ok("lease: EXPIRING → RENEWAL_PENDING", () => {
  assert.ok(canTransitionLease("EXPIRING", "RENEWAL_PENDING"));
});

ok("lease: RENEWAL_PENDING → ACTIVE (renewed)", () => {
  assert.ok(canTransitionLease("RENEWAL_PENDING", "ACTIVE"));
});

throws("lease: EXPIRED → ACTIVE (terminal)", () => {
  assertLeaseTransition("EXPIRED", "ACTIVE");
});

throws("lease: TERMINATED → ACTIVE (terminal)", () => {
  assertLeaseTransition("TERMINATED", "ACTIVE");
});

throws("lease: DRAFT → ACTIVE (skip signature)", () => {
  assertLeaseTransition("DRAFT", "ACTIVE");
});

// ══════════════════════════════════════════════════════════════
// MAINTENANCE TRANSITIONS
// ══════════════════════════════════════════════════════════════

ok("maintenance: SUBMITTED → ACKNOWLEDGED", () => {
  assert.ok(canTransitionMaintenance("SUBMITTED", "ACKNOWLEDGED"));
});

ok("maintenance: SUBMITTED → CANCELLED", () => {
  assert.ok(canTransitionMaintenance("SUBMITTED", "CANCELLED"));
});

ok("maintenance: ACKNOWLEDGED → ASSIGNED", () => {
  assert.ok(canTransitionMaintenance("ACKNOWLEDGED", "ASSIGNED"));
});

ok("maintenance: ASSIGNED → IN_PROGRESS", () => {
  assert.ok(canTransitionMaintenance("ASSIGNED", "IN_PROGRESS"));
});

ok("maintenance: IN_PROGRESS → WAITING_FOR_PARTS", () => {
  assert.ok(canTransitionMaintenance("IN_PROGRESS", "WAITING_FOR_PARTS"));
});

ok("maintenance: WAITING_FOR_PARTS → IN_PROGRESS", () => {
  assert.ok(canTransitionMaintenance("WAITING_FOR_PARTS", "IN_PROGRESS"));
});

ok("maintenance: IN_PROGRESS → RESOLVED", () => {
  assert.ok(canTransitionMaintenance("IN_PROGRESS", "RESOLVED"));
});

ok("maintenance: RESOLVED → CLOSED", () => {
  assert.ok(canTransitionMaintenance("RESOLVED", "CLOSED"));
});

ok("maintenance: RESOLVED → IN_PROGRESS (reopen)", () => {
  assert.ok(canTransitionMaintenance("RESOLVED", "IN_PROGRESS"));
});

ok("maintenance: IN_PROGRESS → WAITING_FOR_TENANT", () => {
  assert.ok(canTransitionMaintenance("IN_PROGRESS", "WAITING_FOR_TENANT"));
});

ok("maintenance: WAITING_FOR_TENANT → IN_PROGRESS", () => {
  assert.ok(canTransitionMaintenance("WAITING_FOR_TENANT", "IN_PROGRESS"));
});

throws("maintenance: CLOSED → IN_PROGRESS (terminal)", () => {
  assertMaintenanceTransition("CLOSED", "IN_PROGRESS");
});

throws("maintenance: CANCELLED → IN_PROGRESS (terminal)", () => {
  assertMaintenanceTransition("CANCELLED", "IN_PROGRESS");
});

// ══════════════════════════════════════════════════════════════
// APPLICATION TRANSITIONS
// ══════════════════════════════════════════════════════════════

ok("application: SUBMITTED → UNDER_REVIEW", () => {
  assert.ok(canTransitionApplication("SUBMITTED", "UNDER_REVIEW"));
});

ok("application: UNDER_REVIEW → SHORTLISTED", () => {
  assert.ok(canTransitionApplication("UNDER_REVIEW", "SHORTLISTED"));
});

ok("application: UNDER_REVIEW → APPROVED", () => {
  assert.ok(canTransitionApplication("UNDER_REVIEW", "APPROVED"));
});

ok("application: UNDER_REVIEW → REJECTED", () => {
  assert.ok(canTransitionApplication("UNDER_REVIEW", "REJECTED"));
});

ok("application: UNDER_REVIEW → WITHDRAWN", () => {
  assert.ok(canTransitionApplication("UNDER_REVIEW", "WITHDRAWN"));
});

ok("application: SHORTLISTED → APPROVED", () => {
  assert.ok(canTransitionApplication("SHORTLISTED", "APPROVED"));
});

throws("application: APPROVED → REJECTED (terminal)", () => {
  assertApplicationTransition("APPROVED", "REJECTED");
});

throws("application: REJECTED → APPROVED (terminal)", () => {
  assertApplicationTransition("REJECTED", "APPROVED");
});

// ══════════════════════════════════════════════════════════════
// RENEWAL TRANSITIONS
// ══════════════════════════════════════════════════════════════

ok("renewal: OFFERED → TENANT_REVIEWING", () => {
  assert.ok(canTransitionRenewal("OFFERED", "TENANT_REVIEWING"));
});

ok("renewal: TENANT_REVIEWING → ACCEPTED", () => {
  assert.ok(canTransitionRenewal("TENANT_REVIEWING", "ACCEPTED"));
});

ok("renewal: TENANT_REVIEWING → DECLINED", () => {
  assert.ok(canTransitionRenewal("TENANT_REVIEWING", "DECLINED"));
});

ok("renewal: OFFERED → EXPIRED", () => {
  assert.ok(canTransitionRenewal("OFFERED", "EXPIRED"));
});

throws("renewal: ACCEPTED → DECLINED (terminal)", () => {
  assertRenewalTransition("ACCEPTED", "DECLINED");
});

throws("renewal: DECLINED → ACCEPTED (terminal)", () => {
  assertRenewalTransition("DECLINED", "ACCEPTED");
});

// ══════════════════════════════════════════════════════════════
// UNIT TRANSITIONS
// ══════════════════════════════════════════════════════════════

ok("unit: AVAILABLE → RESERVED", () => {
  assert.ok(canTransitionUnit("AVAILABLE", "RESERVED"));
});

ok("unit: RESERVED → OCCUPIED", () => {
  assert.ok(canTransitionUnit("RESERVED", "OCCUPIED"));
});

ok("unit: OCCUPIED → MAINTENANCE", () => {
  assert.ok(canTransitionUnit("OCCUPIED", "MAINTENANCE"));
});

ok("unit: MAINTENANCE → AVAILABLE", () => {
  assert.ok(canTransitionUnit("MAINTENANCE", "AVAILABLE"));
});

ok("unit: OCCUPIED → AVAILABLE (not valid directly, but via MAINTENANCE)", () => {
  // Actually OCCUPIED → MAINTENANCE → AVAILABLE is the flow
  // Let's test OCCUPIED → AVAILABLE is NOT valid
  assert.ok(!canTransitionUnit("OCCUPIED", "AVAILABLE"));
});

throws("unit: AVAILABLE → OCCUPIED (skip reserved)", () => {
  assertUnitTransition("AVAILABLE", "OCCUPIED");
});

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════

ok("tenancyAfterMoveIn: PENDING → ACTIVE", () => {
  assert.equal(tenancyAfterMoveIn("PENDING"), "ACTIVE");
});

ok("tenancyAfterMoveIn: ACTIVE stays ACTIVE", () => {
  assert.equal(tenancyAfterMoveIn("ACTIVE"), "ACTIVE");
});

ok("tenancyAfterMoveOut: MOVE_OUT_SCHEDULED → ENDED", () => {
  assert.equal(tenancyAfterMoveOut("MOVE_OUT_SCHEDULED"), "ENDED");
});

ok("tenancyAfterMoveOut: NOTICE_GIVEN → ENDED", () => {
  assert.equal(tenancyAfterMoveOut("NOTICE_GIVEN"), "ENDED");
});

ok("tenancyAfterMoveOut: ACTIVE stays ACTIVE", () => {
  assert.equal(tenancyAfterMoveOut("ACTIVE"), "ACTIVE");
});

ok("shouldExpireLease: past end date + ACTIVE → true", () => {
  const pastDate = new Date(Date.now() - 86400000);
  assert.ok(shouldExpireLease(pastDate, "ACTIVE"));
});

ok("shouldExpireLease: future end date → false", () => {
  const futureDate = new Date(Date.now() + 86400000 * 30);
  assert.ok(!shouldExpireLease(futureDate, "ACTIVE"));
});

ok("shouldExpireTenancy: past move-out + ACTIVE → true", () => {
  const pastDate = new Date(Date.now() - 86400000);
  assert.ok(shouldExpireTenancy(pastDate, "ACTIVE"));
});

ok("shouldExpireTenancy: null date → false", () => {
  assert.ok(!shouldExpireTenancy(null, "ACTIVE"));
});

// ══════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
