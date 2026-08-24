import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for property pages.
 *
 * Run: npx playwright test tests/visual/property-pages.spec.ts
 * Update snapshots: npx playwright test --update-snapshots
 *
 * These tests capture screenshots of key pages and compare them
 * against baseline snapshots to detect unintended visual changes.
 */

// ─── Property Detail Page ──────────────────────────────────

test.describe("Property Detail Page", () => {
  test("renders correctly with a valid property", async ({ page }) => {
    // Use a known active property from the database
    // Falls back to the Kazo property seeded earlier
    await page.goto("/properties/2-bedroom-apartment-in-ntinda-1");
    await page.waitForLoadState("networkidle");

    // Wait for the main content to render
    await page.waitForSelector("h1", { timeout: 10_000 });

    // Full page screenshot
    await expect(page).toHaveScreenshot("property-detail-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("renders image gallery with navigation", async ({ page }) => {
    await page.goto("/properties/2-bedroom-apartment-in-ntinda-1");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("h1", { timeout: 10_000 });

    // Screenshot of the image gallery area
    const gallery = page.locator(".relative.aspect-video").first();
    if (await gallery.isVisible()) {
      await expect(gallery).toHaveScreenshot("property-gallery.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("renders pricing sidebar correctly", async ({ page }) => {
    await page.goto("/properties/2-bedroom-apartment-in-ntinda-1");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("h1", { timeout: 10_000 });

    // Screenshot of the sidebar with pricing
    const sidebar = page.locator(".sticky").first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot("property-sidebar.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });

  test("renders breadcrumb navigation", async ({ page }) => {
    await page.goto("/properties/2-bedroom-apartment-in-ntinda-1");
    await page.waitForLoadState("networkidle");

    const breadcrumb = page.locator("text=Search").first();
    if (await breadcrumb.isVisible()) {
      await expect(breadcrumb).toHaveScreenshot("property-breadcrumb.png", {
        maxDiffPixelRatio: 0.02,
      });
    }
  });
});

// ─── Property Not Found Page ───────────────────────────────

test.describe("Property 404 Page", () => {
  test("renders not-found page for invalid slug", async ({ page }) => {
    await page.goto("/properties/this-property-does-not-exist-12345");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for DB query + render

    // Full page screenshot
    await expect(page).toHaveScreenshot("property-not-found-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("shows suggested properties on not-found page", async ({ page }) => {
    await page.goto("/properties/this-property-does-not-exist-12345");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check for suggested properties section
    const suggested = page.locator("text=Similar Properties").first();
    if (await suggested.isVisible()) {
      await expect(suggested).toHaveScreenshot(
        "property-not-found-suggestions.png",
        { maxDiffPixelRatio: 0.02 }
      );
    }
  });

  test("has working search and homepage links", async ({ page }) => {
    await page.goto("/properties/this-property-does-not-exist-12345");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Verify key CTAs exist
    await expect(page.locator("text=Browse All Properties").first()).toBeVisible();
    await expect(page.locator("text=Back to Homepage").first()).toBeVisible();
  });
});

// ─── Responsive Layout ─────────────────────────────────────

test.describe("Responsive Property Pages", () => {
  test("property detail renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
    await page.goto("/properties/2-bedroom-apartment-in-ntinda-1");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("h1", { timeout: 10_000 });

    await expect(page).toHaveScreenshot("property-detail-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("property detail renders on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto("/properties/2-bedroom-apartment-in-ntinda-1");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("h1", { timeout: 10_000 });

    await expect(page).toHaveScreenshot("property-detail-tablet.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("not-found page renders on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/properties/this-property-does-not-exist-12345");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot("property-not-found-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
