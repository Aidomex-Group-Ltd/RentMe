/**
 * Stage 4 gate — Backend Fee Engine.
 * Run: npm run test:fees
 * The engine is the single source of truth; these assertions pin its contract.
 */
import { strict as assert } from "node:assert";
import {
  calculatePropertyFees,
  calculatePropertyFeesFromProperty,
  validateFeeConfig,
} from "../src/lib/fees";

let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

// ── Core math ────────────────────────────────────────────────
ok("base case: rent×1 + 5% charge", () => {
  const f = calculatePropertyFees({ monthlyRent: 800000 });
  assert.equal(f.minimumMonths, 1);
  assert.equal(f.rentSubtotal, 800000);
  assert.equal(f.serviceCharge, 40000); // exactly 5%
  assert.equal(f.deposit, 0);
  assert.equal(f.agencyFee, 0);
  assert.equal(f.totalMoveInCost, 840000);
});

ok("balance identity: subtotal+deposit+agency+charge === total", () => {
  const f = calculatePropertyFees({
    monthlyRent: 1234567,
    deposit: 500000,
    agencyFee: 250000,
    minimumMonths: 3,
    isAgentListing: true,
  });
  assert.equal(
    f.totalMoveInCost,
    f.rentSubtotal + f.deposit + f.agencyFee + f.serviceCharge
  );
});

ok("service charge rounds to nearest UGX (static 5% of MONTHLY rent)", () => {
  const f = calculatePropertyFees({ monthlyRent: 1234567 });
  assert.equal(f.rent, 1234567);
  assert.equal(f.serviceCharge, Math.round(1234567 * 0.05)); // 61728
});

ok("optional deposit omitted → 0; negative clamped to 0", () => {
  assert.equal(calculatePropertyFees({ monthlyRent: 500000 }).deposit, 0);
  assert.equal(
    calculatePropertyFees({ monthlyRent: 500000, deposit: -100 }).deposit, 0
  );
});

// ── Backend overrides frontend (agent-only rule) ─────────────
ok("non-agent listing: supplied agencyFee FORCED to 0 in total", () => {
  const f = calculatePropertyFees({
    monthlyRent: 800000,
    agencyFee: 999999, // malicious/buggy client value
    isAgentListing: false,
  });
  assert.equal(f.agencyFee, 0);
  assert.equal(f.totalMoveInCost, 840000);
});
ok("agent listing: agency fee included", () => {
  const f = calculatePropertyFees({
    monthlyRent: 800000,
    agencyFee: 100000,
    isAgentListing: true,
  });
  assert.equal(f.agencyFee, 100000);
  assert.equal(f.totalMoveInCost, 940000);
});
ok("userRole=AGENT also unlocks agency fee", () => {
  const f = calculatePropertyFees({
    monthlyRent: 800000,
    agencyFee: 100000,
    userRole: "AGENT",
  });
  assert.equal(f.agencyFee, 100000);
});

// ── Minimum months ───────────────────────────────────────────
ok("minimumMonths multiplies rent subtotal", () => {
  const f = calculatePropertyFees({ monthlyRent: 800000, minimumMonths: 3 });
  assert.equal(f.rentSubtotal, 2400000);
  // service charge stays tied to ONE month's rent
  assert.equal(f.serviceCharge, 40000);
  assert.equal(f.totalMoveInCost, 2440000);
});
ok("minimumMonths floors at 1 even if client sends 0/negative", () => {
  assert.equal(calculatePropertyFees({ monthlyRent: 100000, minimumMonths: 0 }).minimumMonths, 1);
  assert.equal(calculatePropertyFees({ monthlyRent: 100000, minimumMonths: -5 }).minimumMonths, 1);
});
ok("rent floors at 0 for absurd input", () => {
  const f = calculatePropertyFees({ monthlyRent: -900 });
  assert.equal(f.rent, 0);
  assert.equal(f.totalMoveInCost, 0);
});

// ── Frequency derivation + stored precedence ─────────────────
ok("frequency map: MONTHLY→1 WEEKLY→4 QUARTERLY→3 ANNUALLY→12", () => {
  const cases: Array<[string, number]> = [
    ["MONTHLY", 1], ["WEEKLY", 4], ["QUARTERLY", 3], ["ANNUALLY", 12],
  ];
  for (const [freq, months] of cases) {
    const f = calculatePropertyFeesFromProperty({ rent: 100000, paymentFrequency: freq } as never);
    assert.equal(f.minimumMonths, months, freq);
  }
});
ok("stored landlord-chosen minimumMonths PRECEDES frequency", () => {
  const f = calculatePropertyFeesFromProperty({
    rent: 100000,
    paymentFrequency: "MONTHLY",
    minimumMonths: 6,
  } as never);
  assert.equal(f.minimumMonths, 6);
  assert.equal(f.rentSubtotal, 600000);
});
ok("null/invalid stored minimumMonths falls back to frequency", () => {
  const f = calculatePropertyFeesFromProperty({
    rent: 100000,
    paymentFrequency: "ANNUALLY",
    minimumMonths: null,
  } as never);
  assert.equal(f.minimumMonths, 12);
  const f2 = calculatePropertyFeesFromProperty({
    rent: 100000,
    paymentFrequency: "ANNUALLY",
    minimumMonths: 0,
  } as never);
  assert.equal(f2.minimumMonths, 12);
});

// ── Validation rules ─────────────────────────────────────────
ok("validateFeeConfig rejects negatives and out-of-range months", () => {
  assert.match(String(validateFeeConfig({ deposit: -1 })), /negative/i);
  assert.match(String(validateFeeConfig({ agencyFee: -1 })), /negative/i);
  assert.match(String(validateFeeConfig({ minimumMonths: 13 })), /between 1 and 12/i);
  assert.match(String(validateFeeConfig({ minimumMonths: 0 })), /between 1 and 12/i);
  assert.equal(validateFeeConfig({ deposit: 100, minimumMonths: 6 }), null);
});
ok("validateFeeConfig enforces agent-only agency fee", () => {
  assert.match(
    String(validateFeeConfig({ agencyFee: 100000, isAgentListing: false })),
    /agent/i
  );
  assert.equal(
    validateFeeConfig({ agencyFee: 100000, isAgentListing: true }),
    null
  );
});

console.log(`\nSTAGE 4 GATE PASSED — ${passed} assertions green`);
