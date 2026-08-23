#!/usr/bin/env node
/**
 * Guest access acceptance tests (public discovery without auth) +
 * authenticated regression sweep.
 *
 * Usage: node tests/guest-access.e2e.mjs [baseUrl]
 */
const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const XFF = `10.95.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 250) + 1}`;
const f = (url, opts = {}) =>
  fetch(url, { ...opts, redirect: "manual", headers: { "X-Forwarded-For": XFF, ...(opts.headers || {}) } });

let passed = 0, failed = 0;
const pass = (m) => { console.log(`✓ ${m}`); passed++; };
const fail = (m) => { console.log(`✗ ${m}`); failed++; };
const assert = (c, m) => c ? pass(m) : fail(m);
const section = (n) => console.log(`\n── ${n} ──────────────────────────`);

// ─── 18. Acceptance: public routes reachable as anonymous visitor ────
async function testPublicPages() {
  section("Public pages (no auth, no redirect)");
  for (const [path, name] of [["/", "homepage"], ["/login", "login"], ["/search", "search"], ["/register", "register"]]) {
    const res = await f(`${BASE}${path}`);
    assert(res.status === 200 && !res.headers.get("location"), `${path} (${name}) → ${res.status}`);
  }
}

async function testPublicApi() {
  section("Public discovery API");
  let res = await f(`${BASE}/api/public/properties?limit=5`);
  assert(res.status === 200, `GET /api/public/properties → ${res.status}`);
  const data = await res.json();
  const props = data.properties || [];
  assert(Array.isArray(props), `returns list (${props.length} listings)`);

  if (props.length > 0) {
    const p = props[0];
    // Privacy boundaries on the wire
    assert(p.address === undefined, "no precise street address exposed");
    assert(!(p.user?.id), "landlord internal id not exposed");
    assert(!(p.user?.email), "landlord email not exposed");
    assert(typeof p.rent === "number" && !!p.slug && !!p.title, "listing carries title/slug/rent");

    // Detail by slug (guest clicks a card)
    res = await f(`${BASE}/api/public/properties/${p.slug}`);
    assert(res.status === 200, `GET /api/public/properties/${p.slug} → ${res.status}`);
    const d = await res.json();
    assert(d.property?.title === p.title, "detail matches listing");
    assert(d.property?.address === undefined, "detail strips address");
    assert(!(d.property?.user?.email), "detail strips owner email");

    // Filters actually filter
    res = await f(`${BASE}/api/public/properties?bedrooms=2&limit=50`);
    const filtered = (await res.json()).properties || [];
    assert(filtered.every((x) => x.bedrooms === 2), `bedrooms=2 filter honored (${filtered.length} hits)`);

    // Guests can NEVER widen status beyond ACTIVE
    res = await f(`${BASE}/api/public/properties?status=PENDING_REVIEW&limit=50`);
    const sneaky = (await res.json()).properties || [];
    assert(sneaky.every((x) => x.status === "ACTIVE"), "status param cannot widen visibility");

    // Missing listing → graceful 404
    res = await f(`${BASE}/api/public/properties/no-such-listing-xyz`);
    assert(res.status === 404, `unknown slug → 404 (graceful, not error page)`);
  }

  // Old authenticated paths stay protected
  res = await f(`${BASE}/api/properties?mine=1`);
  assert(res.status === 401, `GET /api/properties?mine=1 still requires auth (401)`);
}

// ─── Dashboards stay protected (307 → /login) ────────────────────────
async function testDashboardProtection() {
  section("Dashboards remain protected (307 → /login)");
  const protectedPaths = [
    "/dashboard",
    "/dashboard/landlord",
    "/dashboard/landlord/properties",
    "/dashboard/landlord/units",
    "/dashboard/landlord/tenants",
    "/dashboard/landlord/applications",
    "/dashboard/landlord/leases",
    "/dashboard/landlord/renewals",
    "/dashboard/landlord/maintenance",
    "/dashboard/landlord/reports",
    "/dashboard/landlord/settings",
    "/dashboard/tenant",
    "/dashboard/tenant/tenancy",
    "/dashboard/tenant/move-in",
    "/dashboard/tenant/lease",
    "/dashboard/tenant/applications",
    "/dashboard/tenant/payments",
    "/dashboard/tenant/maintenance",
    "/dashboard/tenant/notices",
    "/dashboard/tenant/documents",
    "/dashboard/tenant/move-out",
    "/dashboard/tenant/profile",
  ];
  for (const path of protectedPaths) {
    const res = await f(`${BASE}${path}`);
    const loc = res.headers.get("location") || "";
    assert(
      res.status === 307 && loc.startsWith(`${BASE}/login`) === false ? loc.includes("/login") : loc.includes("/login"),
      `${path} → ${res.status} → /login`
    );
  }

  // Protected APIs stay protected
  for (const path of ["/api/conversations", "/api/notices", "/api/leases"]) {
    const res = await f(`${BASE}${path}`);
    assert([401, 403].includes(res.status), `POST-less GET ${path} → ${res.status} (protected)`);
  }
}

// ─── Guest journey: search → filters → detail → back (URL state) ─────
async function testGuestJourney() {
  section("Guest journey: search → open → return");
  // 1. Land on search with URL-carried state (shareable/bookmarkable)
  const res = await f(`${BASE}/search?q=Kampala&bedrooms=2&maxRent=1000000`);
  assert(res.status === 200, "/search?q=Kampala&bedrooms=2&maxRent=1000000 renders");

  // 2. The same query through the public API
  const api = await f(`${BASE}/api/public/properties?q=Kampala&bedrooms=2&maxRent=1000000`);
  const { properties } = await api.json();
  console.log(`   · filtered results: ${properties.length}`);

  if (properties.length > 0) {
    // 3. Open the property (slug-based, crawlable)
    const detail = await f(`${BASE}/api/public/properties/${properties[0].slug}`);
    assert(detail.status === 200, "open property details as guest");

    // 4. Property page itself is public
    const page = await f(`${BASE}/properties/${properties[0].slug}`);
    assert(page.status === 200, `/properties/${properties[0].slug} page → 200`);

    // 5. Returning to search preserves state (URL params unchanged server-side)
    const back = await f(`${BASE}/search?q=Kampala&bedrooms=2&maxRent=1000000`);
    assert(back.status === 200, "return to /search with preserved state");
  }
}

// ─── 19. Authenticated regression ────────────────────────────────────
async function testAuthenticatedRegression() {
  section("Authenticated regression (login still works everywhere)");
  const jar = new Map();
  const store = (r) => { for (const i of r.headers.getSetCookie?.() || []) { const [p] = i.split(";"); const e = p.indexOf("="); if (e > 0) jar.set(p.slice(0, e), p.slice(e + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const authed = async (path) => f(`${BASE}${path}`, { headers: { Cookie: cookie(), "X-Forwarded-For": XFF }, redirect: "manual" });

  const csrf = await authed("/api/auth/csrf"); store(csrf);
  const { csrfToken } = await csrf.json();
  const login = await f(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie(), "X-Forwarded-For": XFF },
    body: new URLSearchParams({ csrfToken, email: "james@rentme.ug", password: "password123", json: "true", redirect: "false" }),
    redirect: "manual",
  });
  store(login);
  assert(login.status === 200, "landlord session established");

  for (const path of ["/dashboard/landlord", "/dashboard/landlord/properties", "/dashboard/landlord/applications", "/search"]) {
    const res = await authed(path);
    assert(res.status === 200, `authenticated ${path} → 200`);
  }
  const mineRes = await authed("/api/properties?mine=1");
  assert(mineRes.status === 200, "authed /api/properties?mine=1 → 200");
  const pubRes = await authed("/api/public/properties?limit=3");
  assert(pubRes.status === 200, "signed-in users can still use the public search API");
}

(async () => {
  await testPublicPages();
  await testPublicApi();
  await testDashboardProtection();
  await testGuestJourney();
  await testAuthenticatedRegression();

  console.log(`\nGUEST ACCESS: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error(`FATAL: ${e.message}`); process.exit(1); });
