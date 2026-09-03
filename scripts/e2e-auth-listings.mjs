#!/usr/bin/env node
/**
 * E2E persistence checks against a live Erikot Properties deployment.
 * Usage: node scripts/e2e-auth-listings.mjs [baseUrl]
 */
const BASE = (process.argv[2] || process.env.E2E_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function main() {
  const stamp = Date.now();
  const phone = `+25670${String(stamp).slice(-7)}`;
  const email = `e2e.${stamp}@rentme.test`;
  const password = "RentMeE2EPass1!";
  const jar = new Map();

  const storeCookies = (res) => {
    const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    const list = raw.length
      ? raw
      : (res.headers.get("set-cookie") || "")
          .split(/,(?=\s*[^;]+=)/)
          .map((s) => s.trim())
          .filter(Boolean);
    for (const item of list) {
      const [pair] = item.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };

  const cookieHeader = () =>
    [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  console.log(`E2E base: ${BASE}`);

  // 0) Footer / marketing routes must resolve (no RSC 404s)
  const publicRoutes = [
    "/about",
    "/contact",
    "/pricing",
    "/guides/landlord",
    "/stories",
    "/safety",
    "/login",
    "/forgot-password",
    "/reset-password",
  ];
  for (const path of publicRoutes) {
    const res = await fetch(`${BASE}${path}`);
    assert(res.status === 200, `Expected 200 for ${path}, got ${res.status}`);
  }
  console.log("✓ public footer + auth routes resolve");

  // Dashboard routes exist (auth middleware may redirect unauthenticated → login)
  for (const path of ["/dashboard/tenant", "/dashboard/landlord", "/dashboard/agent"]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    assert(
      res.status === 200 || res.status === 307 || res.status === 302,
      `Expected dashboard route ${path} to resolve, got ${res.status}`
    );
  }
  console.log("✓ dashboard routes exist");

  // 1) Register landlord
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Landlord",
      email,
      phone,
      password,
      role: "LANDLORD",
    }),
  });
  const regBody = await parseJson(regRes);
  assert(regRes.status === 201, `Register failed: ${regRes.status} ${JSON.stringify(regBody)}`);
  assert(regBody.user?.id, "Register did not return user id");
  console.log("✓ register persisted user", regBody.user.id);

  // 1b) Duplicate register must return structured 409
  const dupRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Landlord",
      email,
      phone,
      password,
      role: "LANDLORD",
    }),
  });
  const dupBody = await parseJson(dupRes);
  assert(dupRes.status === 409, `Expected 409 on duplicate register, got ${dupRes.status}`);
  assert(
    dupBody.error?.code === "ACCOUNT_EXISTS" ||
      String(dupBody.error?.message || dupBody.error || "").toLowerCase().includes("already"),
    `Duplicate register missing ACCOUNT_EXISTS UX: ${JSON.stringify(dupBody)}`
  );
  console.log("✓ duplicate register returns 409 with clear message");

  // 1c) Forgot password (no enumeration) + invalid reset token
  const forgotRes = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const forgotBody = await parseJson(forgotRes);
  assert(forgotRes.status === 200, `Forgot password failed: ${forgotRes.status}`);
  assert(
    String(forgotBody.message || "").toLowerCase().includes("if an account"),
    `Forgot password missing generic message: ${JSON.stringify(forgotBody)}`
  );

  const badReset = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "not-a-valid-token", password: "NewPass123!" }),
  });
  assert(badReset.status === 400, `Expected 400 for bad reset token, got ${badReset.status}`);
  console.log("✓ forgot-password + reset-password validation");

  // 2) CSRF + credentials login
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  storeCookies(csrfRes);
  const { csrfToken } = await parseJson(csrfRes);
  assert(csrfToken, "Missing csrf token");

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      json: "true",
      redirect: "false",
    }),
    redirect: "manual",
  });
  storeCookies(loginRes);
  assert(loginRes.status === 200, `Login failed: ${loginRes.status}`);

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader() },
  });
  const session = await parseJson(sessionRes);
  assert(session?.user?.email === email, `Session missing user: ${JSON.stringify(session)}`);
  assert(session.user.role === "LANDLORD", `Unexpected role: ${session.user.role}`);
  console.log("✓ authentication session persisted");

  // 3a) Short description must be rejected with field-level error
  const shortRes = await fetch(`${BASE}/api/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({
      title: `E2E Short ${stamp}`,
      description: "fully furnished ",
      propertyType: "2_bedroom",
      bedrooms: 3,
      bathrooms: 1,
      rent: 1500000,
      district: "Wakiso",
    }),
  });
  const shortBody = await parseJson(shortRes);
  assert(shortRes.status === 400, `Expected 400 for short description, got ${shortRes.status}`);
  assert(
    shortBody.error?.fields?.description ||
      (Array.isArray(shortBody.details) &&
        shortBody.details.some((d) => d.path?.includes?.("description"))),
    `Short description missing field error: ${JSON.stringify(shortBody)}`
  );
  console.log("✓ short description rejected with field error");

  // 3b) Create listing with valid payload
  const createRes = await fetch(`${BASE}/api/properties`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader(),
    },
    body: JSON.stringify({
      title: `E2E Listing ${stamp}`,
      description:
        "Automated e2e listing used to verify landlord dashboard persistence across PENDING_REVIEW.",
      propertyType: "2_bedroom",
      bedrooms: 2,
      bathrooms: 1,
      rent: 950000,
      deposit: 950000,
      district: "Kampala",
      city: "Kampala",
      neighborhood: "Ntinda",
      address: "Near Ntinda Shopping Center",
      isFurnished: true,
      hasParking: true,
      hasWater: true,
      hasElectricity: true,
    }),
  });
  const createBody = await parseJson(createRes);
  assert(
    createRes.status === 201,
    `Create listing failed: ${createRes.status} ${JSON.stringify(createBody)}`
  );
  const propertyId = createBody.property?.id;
  assert(propertyId, "Create listing missing property id");
  console.log("✓ listing created", propertyId, createBody.property.status);

  // 4) Mine listings must include the new property (bug: ACTIVE-only hid PENDING_REVIEW)
  const mineRes = await fetch(`${BASE}/api/properties?mine=1&limit=50`, {
    headers: { Cookie: cookieHeader() },
  });
  const mineBody = await parseJson(mineRes);
  assert(mineRes.status === 200, `Mine fetch failed: ${mineRes.status}`);
  const found = (mineBody.properties || []).find((p) => p.id === propertyId);
  assert(found, "Created listing not returned by mine=1 (persistence/dashboard bug)");
  console.log("✓ listing persists on landlord mine query");

  // 5) Re-login and confirm still present
  const jar2 = new Map();
  const store2 = (res) => {
    const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    for (const item of raw) {
      const [pair] = item.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) jar2.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  };
  const csrf2Res = await fetch(`${BASE}/api/auth/csrf`);
  store2(csrf2Res);
  const csrf2 = await parseJson(csrf2Res);
  const login2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: [...jar2.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body: new URLSearchParams({
      csrfToken: csrf2.csrfToken,
      email,
      password,
      json: "true",
      redirect: "false",
    }),
  });
  store2(login2);
  const mine2 = await fetch(`${BASE}/api/properties?mine=1&limit=50`, {
    headers: {
      Cookie: [...jar2.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    },
  });
  const mine2Body = await parseJson(mine2);
  assert(
    (mine2Body.properties || []).some((p) => p.id === propertyId),
    "Listing missing after re-login"
  );
  console.log("✓ user + listing still persist after re-authentication");

  // 6) Upload endpoint health (R2 may be missing bucket; report clearly)
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const form = new FormData();
  form.append("file", new Blob([tinyPng], { type: "image/png" }), "pixel.png");
  form.append("propertyId", propertyId);
  const uploadRes = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { Cookie: cookieHeader() },
    body: form,
  });
  const uploadBody = await parseJson(uploadRes);
  if (uploadRes.status === 201) {
    console.log("✓ R2 upload persisted image", uploadBody.url);
  } else if (uploadRes.status === 503) {
    console.log("⚠ R2 not fully configured yet:", uploadBody.error);
  } else {
    console.log("⚠ upload status", uploadRes.status, uploadBody);
  }

  console.log("\nE2E PASSED");
}

main().catch((err) => {
  console.error("\nE2E FAILED:", err.message);
  process.exit(1);
});
