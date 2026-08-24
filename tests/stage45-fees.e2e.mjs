#!/usr/bin/env node
/** Stage 4/5 gate — Fee engine persistence + authorization + UI contract. */
const BASE = (process.argv[2] || "http://127.0.0.1:3100").replace(/\/$/, "");
let passed = 0;
const ok = (m) => { console.log(`✓ ${m}`); passed++; };

function makeClient() {
  const jar = new Map();
  // Synthetic per-client IP → isolated rate-limit buckets across suites.
  const xff = `10.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 250) + 1}`;
  const f = (url, opts = {}) =>
    fetch(url, { ...opts, headers: { "X-Forwarded-For": xff, ...(opts.headers || {}) } });
  const store = (res) => { for (const i of res.headers.getSetCookie?.() || []) { const [p] = i.split(";"); const e = p.indexOf("="); if (e > 0) jar.set(p.slice(0, e), p.slice(e + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  return {
    async register(email, phone) {
      await f(`${BASE}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `S4 ${email.slice(2, 9)}`, email, phone, password: "Stage4Pass1!", role: "LANDLORD" }) });
    },
    async login(email) {
      const c = await f(`${BASE}/api/auth/csrf`); store(c);
      const { csrfToken } = await c.json();
      const r = await f(`${BASE}/api/auth/callback/credentials`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie() }, body: new URLSearchParams({ csrfToken, email, password: "Stage4Pass1!", json: "true", redirect: "false" }), redirect: "manual" });
      store(r);
      if (r.status !== 200) throw new Error(`login ${email} → ${r.status}`);
    },
    api(path, opts = {}) {
      return (async () => {
        let r = await f(`${BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), Cookie: cookie() } });
        if (r.status === 429 && !opts._retried) {
          const wait = Number(r.headers.get("retry-after") || 60);
          console.log(`  … ${path} rate limited, waiting ${wait}s`);
          await new Promise((res) => setTimeout(res, (wait + 1) * 1000));
          r = await f(`${BASE}${path}`, { ...opts, _retried: true, headers: { ...(opts.headers || {}), Cookie: cookie() } });
        }
        return r;
      })();
    },
  };
}

(async () => {
  const stamp = Date.now();
  const ph = (n) => `+25670${String(stamp).slice(-6)}${n}`;
  const L = makeClient(), T = makeClient();
  await L.register(`s4l${stamp}@t.test`, ph("1"));
  await T.register(`s4t${stamp}@t.test`, ph("2"));
  await L.login(`s4l${stamp}@t.test`);
  await T.login(`s4t${stamp}@t.test`);

  // Listing created WITH landlord-chosen minimum months (create-wizard path)
  let r = await L.api("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: `S4 Fees ${stamp}`, description: "fee engine verification property", propertyType: "apartment", rent: 800000, district: "Kampala", minimumMonths: 2 }),
  });
  const property = (await r.json()).property;
  if (!property?.id) throw new Error("listing failed");
  r = await L.api(`/api/properties/${property.id}/fees`);
  let f = (await r.json()).fees;
  if (!(f.minimumMonths === 2 && f.rentSubtotal === 1600000)) throw new Error(`create-path months not persisted: ${JSON.stringify(f)}`);
  ok("create wizard persists landlord-chosen minimumMonths (2 → subtotal 1.6M)");

  // Fees route: update + persistence + backend recalculation
  r = await L.api(`/api/properties/${property.id}/fees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deposit: 500000, minimumMonths: 6 }) });
  f = (await r.json()).fees;
  if (!(r.status === 200 && f.minimumMonths === 6 && f.deposit === 500000 && f.rentSubtotal === 4800000)) throw new Error("fee save failed");
  ok("owner saves deposit+minimumMonths; backend recalculates (subtotal 4.8M)");
  if (f.totalMoveInCost !== 4800000 + 500000 + 40000) throw new Error(`total mismatch: ${f.totalMoveInCost}`);
  ok("total balances (subtotal+deposit+agency+5% charge)");

  // Reload persistence via GET
  f = (await (await L.api(`/api/properties/${property.id}/fees`)).json()).fees;
  if (!(f.minimumMonths === 6 && f.deposit === 500000)) throw new Error("reload lost values");
  ok("values persist across reload");

  // Explicit clear → falls back to frequency default
  await L.api(`/api/properties/${property.id}/fees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minimumMonths: null }) });
  f = (await (await L.api(`/api/properties/${property.id}/fees`)).json()).fees;
  if (f.minimumMonths !== 1) throw new Error("clear did not fall back to MONTHLY default");
  ok("explicit clear falls back to frequency-derived default (1)");

  // Validation paths
  for (const [payload, label] of [
    [{ minimumMonths: 13 }, "minimumMonths=13"],
    [{ minimumMonths: 0 }, "minimumMonths=0"],
    [{ minimumMonths: "abc" }, "non-numeric months"],
    [{ paymentFrequency: "BOGUS" }, "bad frequency"],
    [{ deposit: -50 }, "negative deposit"],
    [{ agencyFee: 100000 }, "agency fee on non-agent listing"],
  ]) {
    r = await L.api(`/api/properties/${property.id}/fees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.status !== 400) throw new Error(`${label} → ${r.status}, expected 400`);
  }
  ok("all six malformed/unauthorized payloads rejected (400)");

  // Authorization
  r = await T.api(`/api/properties/${property.id}/fees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deposit: 1 }) });
  if (r.status !== 403) throw new Error(`non-owner → ${r.status}`);
  ok("non-owner modification rejected (403)");

  console.log(`\nSTAGE 4+5 GATE PASSED — ${passed} checks green`);
})().catch((e) => { console.error(`\nGATE FAILED: ${e.message}`); process.exit(1); });
