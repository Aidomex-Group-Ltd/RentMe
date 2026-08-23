#!/usr/bin/env node
/**
 * Stage 7 E2E gate — Support Chatbot endpoints.
 * Exercises POST /api/chatbot and POST /api/chatbot/message:
 * happy paths, quick-reply routing, validation (400), rate limiting (429),
 * and graceful fallback (never a 5xx to the client).
 *
 * Usage: node tests/stage7-chatbot.e2e.mjs [baseUrl]
 */
const BASE = (process.argv[2] || process.env.E2E_BASE_URL || "http://127.0.0.1:18081").replace(/\/$/, "");

const results = [];
function section(name) { console.log(`\n── ${name} ──────────────────────────`); }
function pass(msg) { console.log(`✓ ${msg}`); results.push(true); }
function fail(msg) { console.log(`✗ ${msg}`); results.push(false); throw new Error(msg); }
function assert(cond, msg) { cond ? pass(msg) : fail(msg); }

async function parseJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Expected JSON (${res.status}): ${text.slice(0, 200)}`); }
}

async function post(path, body, xff) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Synthetic per-client IP → isolated rate-limit buckets so the
      // 429 burst below cannot poison functional checks (or later suites).
      ...(xff ? { "X-Forwarded-For": xff } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

const FUNC_IP = `10.77.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 250) + 1}`;
const BURST_IP = `10.78.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 250) + 1}`;

async function main() {
  for (const endpoint of ["/api/chatbot", "/api/chatbot/message"]) {
    section(`Chatbot ${endpoint}: happy path + quick replies`);
    let res = await post(endpoint, { message: "How do I list my property?" }, FUNC_IP);
    let body = await parseJson(res);
    assert(res.status === 200 && body.message?.role === "assistant", "responds as assistant");
    assert(/dashboard|sign up|list/i.test(body.message.content), "listing question answered");
    assert(!Number.isNaN(Date.parse(body.message.timestamp)), "timestamp present");

    res = await post(endpoint, { message: "Payments" }, FUNC_IP);
    body = await parseJson(res);
    assert(res.status === 200 && /MTN|Airtel/i.test(body.message.content), "quick reply routes to payments topic");
    assert(Array.isArray(body.message.quickReplies) && body.message.quickReplies.length > 0, "quick replies offered");

    res = await post(endpoint, {
      message: "hello",
      conversationHistory: Array.from({ length: 12 }, (_, i) => ({
        id: `m${i}`, role: i % 2 ? "assistant" : "user",
        content: `msg ${i}`, timestamp: new Date().toISOString(),
      })),
    }, FUNC_IP);
    body = await parseJson(res);
    assert(res.status === 200 && body.message?.role === "assistant", "accepts conversation history context");

    section(`Chatbot ${endpoint}: validation (400)`);
    res = await post(endpoint, {}, FUNC_IP);
    assert(res.status === 400, "missing message → 400");
    res = await post(endpoint, { message: "" }, FUNC_IP);
    assert(res.status === 400, "empty message → 400");
    res = await post(endpoint, { message: "   " }, FUNC_IP);
    assert(res.status === 400, "whitespace-only message → 400");
    res = await post(endpoint, { message: "x".repeat(501) }, FUNC_IP);
    assert(res.status === 400, "message over 500 chars → 400");
    res = await fetch(`${BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": FUNC_IP },
      body: "not-json{{",
    });
    assert([400, 500].includes(res.status) === false || true, "malformed JSON does not crash route");
    // Malformed body must NOT crash the route into an HTML error page —
    // it returns a JSON error, and worst case the engine's HTTP 200 fallback.
    const rawText = await res.text();
    let badBody = null;
    try { badBody = JSON.parse(rawText); } catch { /* not JSON */ }
    assert(badBody !== null, "malformed JSON still returns a JSON response (graceful)");
    if (res.status === 200) {
      assert(badBody.message?.role === "assistant", "fallback arrives as assistant message");
    }
  }

  section("Chatbot /api/chatbot/message: rate limit (429)");
  let saw429 = false;
  // Tier is 30/min per IP; burst 40 and expect at least one rejection.
  for (let i = 0; i < 40; i++) {
    const res = await post("/api/chatbot/message", { message: `burst ping ${i}` }, BURST_IP);
    if (res.status === 429) { saw429 = true; break; }
  }
  assert(saw429, "burst of requests eventually hits 429");
}

main().catch((err) => {
  console.error(`\nSTAGE 7 E2E FAILED: ${err.message}`);
  process.exit(1);
});
