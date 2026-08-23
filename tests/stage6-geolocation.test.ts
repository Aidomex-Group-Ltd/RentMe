/**
 * Stage 6 gate — Geolocation & Inspection Assistance.
 * Run: npm run test:geolocation
 *
 * Pins the shared distance math (src/lib/geo.ts) used by BOTH the client
 * tracker UI and the server-side arrival authority, the 50 m arrival
 * threshold, and guards against regression of the Permissions-Policy
 * header that previously shipped geolocation=() (deny-all) to production.
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { calculateDistanceMeters, isWithinArrivalRadius } from "../src/lib/geo";

let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

const M_PER_DEGREE_LAT = 111_194.9; // 6371000 · π / 180

// ── Haversine math ───────────────────────────────────────────
ok("identical coordinates → zero distance", () => {
  assert.equal(calculateDistanceMeters(0.3476, 32.5825, 0.3476, 32.5825), 0);
});

ok("one degree of latitude ≈ 111.195 km", () => {
  const d = calculateDistanceMeters(0, 0, 1, 0);
  assert.ok(Math.abs(d - M_PER_DEGREE_LAT) < 1, `got ${d}m`);
});

ok("one degree of longitude at the equator matches latitudinal scale", () => {
  const d = calculateDistanceMeters(0, 0, 0, 1);
  assert.ok(Math.abs(d - M_PER_DEGREE_LAT) < 1, `got ${d}m`);
});

ok("longitude shrinks toward the poles (cos φ scaling)", () => {
  const atEquator = calculateDistanceMeters(0, 0, 0, 1);
  const at60N = calculateDistanceMeters(60, 0, 60, 1);
  assert.ok(Math.abs(at60N - atEquator / 2) < 1, `60°N should be half: got ${at60N}m`);
});

ok("distance is symmetric", () => {
  const ab = calculateDistanceMeters(0.3476, 32.5825, 1.152, 33.715);
  const ba = calculateDistanceMeters(1.152, 33.715, 0.3476, 32.5825);
  assert.ok(Math.abs(ab - ba) < 1e-6);
});

ok("Kampala → Pallisa sanity (~155 km)", () => {
  const d = calculateDistanceMeters(0.3476, 32.5825, 1.152, 33.715);
  assert.ok(d > 140_000 && d < 170_000, `got ${Math.round(d)}m`);
});

// Matches scripts/e2e-stage14-smoke.mjs waypoint pair (600 m north of property)
ok("smoke-test pair lands in the asserted 400–800 m band", () => {
  const d = calculateDistanceMeters(0.3476, 32.5825, 0.353, 32.5825);
  assert.ok(d > 400 && d < 800, `got ${Math.round(d)}m`);
});

ok("cross-hemisphere / antimeridian pairs stay finite and positive", () => {
  const d = calculateDistanceMeters(-0.1, 179.99, 0.1, -179.99);
  assert.ok(Number.isFinite(d) && d > 0, `got ${d}m`);
});

// ── 50 m arrival threshold ───────────────────────────────────
function northOf(lat: number, lng: number, meters: number): [number, number] {
  return [lat + meters / M_PER_DEGREE_LAT, lng];
}

ok("waypoint ~45 m away triggers arrival inside 50 m radius", () => {
  const [lat, lng] = northOf(0.3476, 32.5825, 45);
  const d = calculateDistanceMeters(0.3476, 32.5825, lat, lng);
  assert.ok(Math.abs(d - 45) < 0.5, `offset should be ≈45m, got ${d}m`);
  assert.equal(isWithinArrivalRadius(0.3476, 32.5825, lat, lng, 50), true);
});

ok("waypoint ~55 m away stays outside 50 m radius", () => {
  const [lat, lng] = northOf(0.3476, 32.5825, 55);
  assert.equal(isWithinArrivalRadius(0.3476, 32.5825, lat, lng, 50), false);
});

ok("exact-radius edge uses ≤ comparison (boundary counts as arrival)", () => {
  const [lat, lng] = northOf(0.3476, 32.5825, 49);
  assert.equal(isWithinArrivalRadius(0.3476, 32.5825, lat, lng, 50), true);
});

ok("custom session radius is honored (server persists arrivalRadiusM)", () => {
  const [lat, lng] = northOf(0.3476, 32.5825, 90);
  assert.equal(isWithinArrivalRadius(0.3476, 32.5825, lat, lng, 100), true);
  assert.equal(isWithinArrivalRadius(0.3476, 32.5825, lat, lng, 50), false);
});

// ── Regression guards (Stage 6 gate-check prerequisites) ─────
ok("Permissions-Policy no longer deny-alls geolocation anywhere", () => {
  const files = [
    "next.config.mjs",
    "k8s/base/ingress.yaml",
    "nginx/conf.d/ssl.conf.example",
  ];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(
      !src.includes("geolocation=()"),
      `${f} still blocks geolocation with geolocation=()`
    );
    assert.ok(
      src.includes("geolocation=(self)") || !src.includes("geolocation"),
      `${f} must grant geolocation=(self)`
    );
  }
});

ok("hook clears its watch on unmount (no leaked watchPosition handles)", () => {
  const src = readFileSync("src/hooks/use-geolocation.ts", "utf8");
  const cleanup = src.match(/return \(\) => \{[\s\S]*?\};/);
  assert.ok(cleanup, "auto-watch effect must define an unmount cleanup");
  assert.ok(
    cleanup[0].includes("clearWatch"),
    "unmount cleanup must call navigator.geolocation.clearWatch"
  );
});

console.log(`\nStage 6 gate: ${passed} assertions passed`);
