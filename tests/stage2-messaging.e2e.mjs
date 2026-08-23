#!/usr/bin/env node
/**
 * Stage 2 gate — Secure Messaging Foundation.
 * Run against a live server:  node tests/stage2-messaging.e2e.mjs [baseUrl]
 * Covers: auth (401), authorization (403), XSS handling, per-user rate
 * limiting (429 + Retry-After), SSE real-time delivery with cursor,
 * conversation metadata, dynamic host discovery.
 */
const BASE = (process.argv[2] || process.env.E2E_BASE_URL || "http://127.0.0.1:3100").replace(/\/$/, "");

let passed = 0;
function ok(msg) { console.log(`✓ ${msg}`); passed++; }
async function parseJson(res) {
  const t = await res.text();
  try { return JSON.parse(t); } catch { throw new Error(`non-JSON (${res.status}): ${t.slice(0, 120)}`); }
}

function makeClient() {
  const jar = new Map();
  // Synthetic per-client IP → isolated rate-limit buckets (middleware and
  // route limiters both honor X-Forwarded-For), so parallel/sequential
  // suites never poison each other's budgets.
  const xff = `10.${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 250) + 1}`;
  const f = (url, opts = {}) =>
    fetch(url, { ...opts, headers: { "X-Forwarded-For": xff, ...(opts.headers || {}) } });
  const store = (res) => {
    const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const item of raw) {
      const [pair] = item.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  return {
    cookie,
    async register(email, phone) {
      const res = await f(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `S2 ${email.slice(5, 12)}`, email, phone, password: "Stage2Pass1!", role: "LANDLORD" }),
      });
      if (!res.ok && !(await res.text()).includes("already exists")) throw new Error(`register failed`);
    },
    async login(email) {
      const csrf = await f(`${BASE}/api/auth/csrf`);
      store(csrf);
      const { csrfToken } = await parseJson(csrf);
      const res = await f(`${BASE}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie() },
        body: new URLSearchParams({ csrfToken, email, password: "Stage2Pass1!", json: "true", redirect: "false" }),
        redirect: "manual",
      });
      store(res);
      if (res.status !== 200) throw new Error(`login ${email} → ${res.status}`);
    },
    api(path, opts = {}) {
      return f(`${BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), Cookie: cookie() } });
    },
  };
}

/** Read SSE frames until predicate met or timeout. Returns {events, frames}. */
function readSSE(url, cookie, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const events = [];
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      resolve({ events, timedOut: true });
    }, timeoutMs);
    fetch(`${BASE}${url}`, {
      headers: { Cookie: cookie, Accept: "text/event-stream" },
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok && res.status !== 200) {
        clearTimeout(timer);
        return reject(Object.assign(new Error(`SSE ${res.status}`), { status: res.status }));
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const frame = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const evLine = frame.split("\n").find((l) => l.startsWith("event: "));
            const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
            if (evLine) {
              const evt = { type: evLine.slice(7).trim(), data: null };
              try { evt.data = JSON.parse(dataLine?.slice(6) || "null"); } catch {}
              events.push(evt);
              if (predicate(evt)) {
                clearTimeout(timer);
                controller.abort();
                return resolve({ events, timedOut: false });
              }
            }
          }
        }
      } catch { /* aborted */ }
    }).catch((e) => { if (e.name !== "AbortError") { clearTimeout(timer); reject(e); } });
  });
}

async function main() {
  const stamp = Date.now();
  // Valid 13-char UG numbers: +256 + 9 digits; distinct last digit per client.
  const ph = (n) => `+25670${String(stamp).slice(-6)}${n}`;

  // ── Dynamic host discovery ─────────────────────────────────
  const fs = await import("fs");
  const threadSrc = fs.readFileSync("src/app/messages/[id]/page.tsx", "utf8");
  if (!/new EventSource\(\s*`\/api\/conversations/.test(threadSrc)) throw new Error("EventSource must use a relative URL");
  ok("client derives stream host dynamically from origin (relative URL)");

  // ── Accounts & listing ─────────────────────────────────────
  const L = makeClient(), T = makeClient(), C = makeClient();
  const le = `s2l${stamp}@rentme.test`, te = `s2t${stamp}@rentme.test`, ce = `s2c${stamp}@rentme.test`;
  await L.register(le, ph("1"));
  await T.register(te, ph("2"));
  await C.register(ce, ph("3"));
  await L.login(le); await T.login(te); await C.login(ce);

  const pres = await L.api("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Stage2 Pad ${stamp}`, description: "messaging gate property",
      propertyType: "2_bedroom", rent: 600000, district: "Kampala", city: "Kampala",
    }),
  });
  const property = (await parseJson(pres)).property;

  // ── Auth: unauthenticated → 401 ────────────────────────────
  for (const [method, path] of [["GET", "/api/conversations"], ["POST", "/api/conversations"], ["GET", `/api/conversations/${property.id}`], ["GET", `/api/conversations/${property.id}/stream`]]) {
    const r = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    if (r.status !== 401) throw new Error(`${method} ${path} unauth → ${r.status}, expected 401`);
  }
  ok("all messaging endpoints reject unauthenticated requests (401)");

  // ── Conversation start + metadata ──────────────────────────
  let r = await T.api("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId: property.id, recipientId: property.userId }),
  });
  const convId = (await parseJson(r)).conversation.id;

  // ── XSS handling ───────────────────────────────────────────
  r = await T.api(`/api/conversations/${convId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "<script>alert('x')</script>hello" }),
  });
  if (r.status !== 400) throw new Error(`<script> payload must be rejected (400), got ${r.status}`);
  ok("<script> payload rejected with 400");

  r = await T.api(`/api/conversations/${convId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "<b>bold</b> plain text" }),
  });
  const sent = (await parseJson(r)).message;
  if (r.status !== 201 || /<b>|<\/b>/.test(sent.content)) throw new Error(`HTML tags must be stripped, got: ${sent.content}`);
  ok(`HTML tags stripped before storage ("${sent.content}")`);

  r = await T.api(`/api/conversations/${convId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "onerror= alert(1)" }),
  });
  if (r.status !== 400) throw new Error(`onerror= payload must be rejected (400), got ${r.status}`);
  ok("inline event-handler payload rejected with 400");

  // ── Metadata in GET (header fix) ───────────────────────────
  r = await T.api(`/api/conversations/${convId}`);
  const meta = (await parseJson(r)).conversation;
  if (!meta?.participants?.length || !meta?.property?.title) throw new Error("GET must include conversation metadata");
  ok(`metadata returned (participants=${meta.participants.length}, property="${meta.property.title}")`);

  // ── Authorization: stranger blocked everywhere ─────────────
  for (const [method, path, expect] of [
    ["GET", `/api/conversations/${convId}`, 403],
    ["GET", `/api/conversations/${convId}/stream`, 403],
    ["POST", `/api/conversations/${convId}`, 403],
  ]) {
    const rr = await C.api(path, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify({ content: "intrude" }) : undefined });
    if (rr.status !== expect) throw new Error(`${method} stranger → ${rr.status}, expected ${expect}`);
  }
  ok("stranger denied read/stream/send on foreign conversation (403)");

  // ── Real-time SSE delivery with cursor ─────────────────────
  const ssePromise = readSSE(`/api/conversations/${convId}/stream`, T.cookie(), (e) => e.type === "message");
  await new Promise((r2) => setTimeout(r2, 500)); // let stream attach
  r = await L.api(`/api/conversations/${convId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "realtime ping from landlord" }),
  });
  if (r.status !== 201) throw new Error("landlord send failed");
  const { events, timedOut } = await ssePromise;
  if (timedOut) throw new Error("SSE did not deliver message within 8s");
  const pushed = events.find((e) => e.type === "message")?.data;
  if (pushed?.content !== "realtime ping from landlord") throw new Error("wrong SSE payload");
  ok(`SSE pushed new message in real-time (${pushed.content})`);

  // Cursor semantics: reconnect with after=<pushed.createdAt> must NOT replay it
  const replay = await readSSE(
    `/api/conversations/${convId}/stream?after=${encodeURIComponent(pushed.createdAt)}`,
    T.cookie(),
    (e) => e.type === "message",
    3500
  );
  if (!replay.timedOut) throw new Error("cursor failed: old message replayed after cursor");
  ok("cursor respected — messages older than ?after are not re-sent");

  // ── Rate limiting: burst sends → 429 + Retry-After ─────────
  let got429 = null;
  for (let i = 0; i < 35; i++) {
    const rr = await T.api(`/api/conversations/${convId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `burst ${i}` }),
    });
    if (rr.status === 429) { got429 = rr; break; }
  }
  if (!got429) throw new Error("expected 429 within 35 rapid sends");
  if (!got429.headers.get("retry-after")) throw new Error("429 missing Retry-After");
  ok("per-user send throttle returns 429 with Retry-After header");

  console.log(`\nSTAGE 2 GATE PASSED — ${passed} checks green`);
}

main().catch((e) => {
  console.error(`\nSTAGE 2 GATE FAILED: ${e.message}`);
  process.exit(1);
});
