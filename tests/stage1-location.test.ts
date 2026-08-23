/**
 * Stage 1 gate — Location Data Layer (Ugandan Districts).
 * Run: npm run test:location
 */
import { strict as assert } from "node:assert";
import {
  ugandanRegions,
  allUgandanDistricts,
  districtsByRegion,
  getDistrictsByRegion,
  getRegionByDistrict,
  getDistrictInfo,
  searchDistricts,
} from "../src/lib/uganda-districts";

let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

// ── Pallisa presence ─────────────────────────────────────────
ok("Pallisa exists in dataset", () => {
  assert.ok(allUgandanDistricts.includes("Pallisa"));
});
ok("Pallisa maps to Eastern region", () => {
  assert.equal(getRegionByDistrict("Pallisa"), "Eastern");
});
ok("getDistrictInfo(Pallisa) returns name+region", () => {
  assert.deepEqual(getDistrictInfo("Pallisa"), { name: "Pallisa", region: "Eastern" });
});

// ── Region structure ─────────────────────────────────────────
ok("exactly 4 canonical regions", () => {
  assert.deepEqual(ugandanRegions, ["Central", "Eastern", "Northern", "Western"]);
});
ok("every region has a non-empty array", () => {
  for (const r of ugandanRegions) assert.ok(districtsByRegion[r].length > 0);
});

// ── Search ───────────────────────────────────────────────────
ok("search is case-insensitive (palli → Pallisa)", () => {
  assert.deepEqual(searchDistricts("palli"), ["Pallisa"]);
});
ok("search 'KAMP' finds Kampala", () => {
  assert.deepEqual(searchDistricts("KAMP"), ["Kampala"]);
});
ok("empty search returns full sorted list", () => {
  assert.deepEqual(searchDistricts(""), allUgandanDistricts);
  assert.deepEqual(searchDistricts("   "), allUgandanDistricts);
});
ok("no-match search returns empty array", () => {
  assert.deepEqual(searchDistricts("atlantis"), []);
});

// ── Region filtering + sorting ───────────────────────────────
ok("region filtering returns sorted copies", () => {
  for (const r of ugandanRegions) {
    const list = getDistrictsByRegion(r);
    assert.deepEqual(list, [...list].sort());
    assert.equal(list.length, districtsByRegion[r].length);
    // copy, not reference
    assert.notEqual(list, districtsByRegion[r]);
  }
});
ok("Pallisa ∈ getDistrictsByRegion('Eastern')", () => {
  assert.ok(getDistrictsByRegion("Eastern").includes("Pallisa"));
});
ok("unknown region yields empty array (no throw)", () => {
  // @ts-expect-error deliberate invalid input at runtime boundary
  assert.deepEqual(getDistrictsByRegion("MiddleEarth"), []);
});

// ── Sorting invariants across whole dataset ──────────────────
ok("flat list sorted alphabetically", () => {
  assert.deepEqual(allUgandanDistricts, [...allUgandanDistricts].sort());
});
ok("source arrays stored pre-sorted", () => {
  for (const [r, ds] of Object.entries(districtsByRegion)) {
    assert.deepEqual(ds, [...ds].sort(), `${r} not sorted`);
  }
});

// ── Integrity ────────────────────────────────────────────────
ok("no duplicate districts across regions", () => {
  const seen = new Set();
  for (const ds of Object.values(districtsByRegion)) {
    for (const d of ds) {
      assert.ok(!seen.has(d), `duplicate: ${d}`);
      seen.add(d);
    }
  }
});
ok("all names trimmed, non-empty, no stray whitespace", () => {
  for (const d of allUgandanDistricts) {
    assert.equal(d.trim(), d);
    assert.ok(d.length >= 4, `implausible district name: ${d}`);
  }
});
ok("invalid legacy names removed", () => {
  for (const bad of ["Kalambira", "Busiki", "Otuuke", "Kyejojo"]) {
    assert.ok(!allUgandanDistricts.includes(bad), `${bad} still present`);
  }
});
ok("reconciled names present", () => {
  for (const good of [
    "Kalangala", "Otuke", "Kyegegwa", "Kotido", "Yumbe",
    "Serere", "Kween", "Bukwo", "Sheema", "Buhweju",
    "Namisindwa", "Kitagwenda", "Karenga",
  ]) {
    assert.ok(allUgandanDistricts.includes(good), `missing: ${good}`);
  }
});
ok("Mpigi belongs only to Central", () => {
  assert.equal(getRegionByDistrict("Mpigi"), "Central");
});
ok("Masaka belongs to Central", () => {
  assert.equal(getRegionByDistrict("Masaka"), "Central");
});
ok("case-insensitive lookup works", () => {
  assert.equal(getRegionByDistrict("pALLIsa"), "Eastern");
});
ok("unknown district returns null region/info", () => {
  assert.equal(getRegionByDistrict("Nowhere"), null);
  assert.equal(getDistrictInfo("Nowhere"), null);
});

// ── Backwards compatibility with existing records ────────────
ok("existing Property.district records remain valid", () => {
  // Canonical DB values observed in staging/production (Stage 0 audit)
  for (const legacy of ["Kampala", "Pallisa"]) {
    assert.ok(
      allUgandanDistricts.includes(legacy),
      `existing record '${legacy}' would become invalid`
    );
  }
});

console.log(`\nSTAGE 1 GATE PASSED — ${passed} assertions green`);
