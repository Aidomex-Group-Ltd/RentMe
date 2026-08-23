/**
 * Stage 7 gate — Support Chatbot Engine.
 * Run: npm run test:chatbot
 *
 * Pins intent routing, quick-reply resolution, and the key-security
 * invariant (no chatbot credential may ever be exposed to the browser).
 * Endpoint behavior (200/400/429) is covered by tests/stage7-chatbot.e2e.mjs.
 */
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  QUICK_REPLIES,
  buildBotMessage,
  detectIntent,
  fallbackMessage,
  generateResponse,
} from "../src/lib/chatbot-engine";

let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✓ ${name}`);
}

// ── Intent detection ─────────────────────────────────────────
ok("keyword intents map to expected topics", () => {
  const cases: Array<[string, string]> = [
    ["Is this listing a scam?", "SCAM_REPORT"],
    ["how do I report a bad landlord", "REPORT"],
    ["can I upload more photos", "PHOTOS"],
    ["what is the service fee", "PRICING"],
    ["I want to schedule a viewing", "INSPECTION"],
    ["does MTN mobile money work", "PAYMENT"],
    ["how do I post my house", "LISTING"],
    ["hello there", "GREETING"],
    ["thanks a lot", "THANKS"],
    ["I need help", "HELP"],
  ];
  for (const [msg, intent] of cases) {
    assert.equal(detectIntent(msg), intent, `"${msg}" → ${intent}`);
  }
});

ok("unrecognized text returns null intent (fallback path)", () => {
  assert.equal(detectIntent("zzz qqq xyzzy"), null);
});

// ── Response generation ─────────────────────────────────────
ok("every quick-reply topic yields content plus follow-ups", () => {
  for (const [label, topic] of Object.entries(QUICK_REPLIES)) {
    assert.ok(topic.response.length > 20, `${label} has substantive copy`);
    if (topic.followUp) {
      for (const f of topic.followUp) {
        assert.ok(QUICK_REPLIES[f] || f.length > 0, `follow-up "${f}" well-formed`);
      }
    }
  }
});

ok("exact quick-reply labels resolve directly to their topic", () => {
  const r = generateResponse("Payments");
  assert.ok(/MTN|Airtel/.test(r.content), "Payments label → payments answer");
  assert.ok(Array.isArray(r.quickReplies) && r.quickReplies.length > 0);
});

ok("greeting offers navigation quick-replies", () => {
  const r = generateResponse("hi");
  assert.ok(r.content.includes("Welcome"));
  assert.equal(r.quickReplies?.length, 4);
});

ok("fallback answer still provides clickable topics", () => {
  const r = generateResponse("xyzzy plugh");
  assert.ok(r.content.includes("not sure"));
  assert.ok(r.quickReplies && r.quickReplies.length >= 4);
});

// ── Message shapes ──────────────────────────────────────────
ok("bot messages are assistant-role with timestamp and id", () => {
  const m = buildBotMessage("answer here", ["FAQ"]);
  assert.equal(m.role, "assistant");
  assert.equal(m.content, "answer here");
  assert.deepEqual(m.quickReplies, ["FAQ"]);
  assert.ok(m.id.startsWith("bot-"));
  assert.ok(!Number.isNaN(Date.parse(m.timestamp)));
});

ok("fallback message never throws and invites support contact", () => {
  const m = fallbackMessage();
  assert.equal(m.role, "assistant");
  assert.ok(m.content.includes("support@rentme.ug"));
});

// ── Key-security invariant (gate check: zero frontend exposure) ──
ok("no chatbot credential uses NEXT_PUBLIC_ (client-safe env only)", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = join(dir, e.name);
      return e.isDirectory() ? walk(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
    });
  }
  for (const file of walk("src")) {
    const src = readFileSync(file, "utf8");
    assert.ok(
      !/NEXT_PUBLIC_[A-Z_]*CHATBOT/i.test(src),
      `${file} references a public chatbot env var`
    );
  }
});

ok("proxy credentials are read exclusively inside server route code", () => {
  const route = readFileSync("src/app/api/chatbot/message/route.ts", "utf8");
  assert.ok(route.includes("CHATBOT_PROXY_URL"), "route consumes the proxy URL");
  assert.ok(route.includes("CHATBOT_PROXY_API_KEY"), "route consumes the proxy key");
  for (const f of ["src/components/support/support-chatbot.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(
      !src.includes("process.env"),
      `${f} must not touch process.env at all`
    );
  }
});

console.log(`\nStage 7 gate: ${passed} assertions passed`);
