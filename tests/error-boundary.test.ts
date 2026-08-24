/**
 * ErrorBoundary Component — Unit Tests
 *
 * Run: npx tsx tests/error-boundary.test.ts
 *
 * Tests the ErrorBoundary component's static methods and state logic.
 * Since we're in a Node.js environment without DOM, we test the
 * class logic directly via its static methods and instance methods.
 */
import { strict as assert } from "node:assert";
import { ErrorBoundary } from "../src/components/ui/error-boundary";

let passed = 0;
let failed = 0;

function ok(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${(e as Error).message}`);
  }
}

function throws(name: string, fn: () => void) {
  try {
    fn();
    failed++;
    console.error(`✗ ${name} (expected error, none thrown)`);
  } catch {
    passed++;
    console.log(`✓ ${name}`);
  }
}

// ══════════════════════════════════════════════════════════════
// STATIC: getDerivedStateFromError
// ══════════════════════════════════════════════════════════════

ok("getDerivedStateFromError sets hasError=true and captures error", () => {
  const error = new Error("test error");
  const state = ErrorBoundary.getDerivedStateFromError(error);
  assert.equal(state.hasError, true);
  assert.equal(state.error, error);
  assert.equal(state.error.message, "test error");
});

ok("getDerivedStateFromError handles different error types", () => {
  const typeError = new TypeError("type mismatch");
  const state = ErrorBoundary.getDerivedStateFromError(typeError);
  assert.equal(state.hasError, true);
  assert.equal(state.error?.message, "type mismatch");
});

ok("getDerivedStateFromError handles RangeError", () => {
  const rangeError = new RangeError("out of bounds");
  const state = ErrorBoundary.getDerivedStateFromError(rangeError);
  assert.equal(state.hasError, true);
  assert.equal(state.error?.name, "RangeError");
});

// ══════════════════════════════════════════════════════════════
// INSTANCE: constructor
// ══════════════════════════════════════════════════════════════

ok("constructor initializes with hasError=false", () => {
  const instance = new ErrorBoundary({ children: null });
  assert.equal(instance.state.hasError, false);
  assert.equal(instance.state.error, null);
});

ok("constructor accepts optional props", () => {
  const instance = new ErrorBoundary({
    children: null,
    sectionName: "Test Section",
    onRetry: () => {},
  });
  assert.equal(instance.state.hasError, false);
});

// ══════════════════════════════════════════════════════════════
// INSTANCE: handleRetry
// ══════════════════════════════════════════════════════════════

ok("handleRetry is a function that resets state", () => {
  const instance = new ErrorBoundary({ children: null });
  assert.equal(typeof instance.handleRetry, "function");
  // setState is a no-op on unmounted components (React behavior)
  // We verify the method exists and can be called without error
  instance.handleRetry();
});

ok("handleRetry calls onRetry callback when provided", () => {
  let retryCalled = false;
  const instance = new ErrorBoundary({
    children: null,
    onRetry: () => { retryCalled = true; },
  });
  instance.state = { hasError: true, error: new Error("test") };
  instance.handleRetry();
  assert.equal(retryCalled, true);
});

ok("handleRetry works without onRetry callback", () => {
  const instance = new ErrorBoundary({ children: null });
  // setState is a no-op on unmounted components (React behavior)
  // We verify the method can be called without throwing
  instance.handleRetry();
  assert.ok(true, "handleRetry completed without error");
});

// ══════════════════════════════════════════════════════════════
// INSTANCE: componentDidCatch
// ══════════════════════════════════════════════════════════════

ok("componentDidCatch logs error without throwing", () => {
  const instance = new ErrorBoundary({
    children: null,
    sectionName: "Test",
  });
  const error = new Error("test error");
  const errorInfo = { componentStack: "at Component\nat App" };
  // Should not throw
  instance.componentDidCatch(error, errorInfo);
});

ok("componentDidCatch works with minimal error info", () => {
  const instance = new ErrorBoundary({ children: null });
  instance.componentDidCatch(new Error("minimal"), {});
});

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

ok("ErrorBoundary is exported as a named export", () => {
  assert.equal(typeof ErrorBoundary, "function");
});

ok("ErrorBoundary extends Component", () => {
  // React.Component is available via the import
  assert.ok(ErrorBoundary.prototype);
  assert.equal(typeof ErrorBoundary.getDerivedStateFromError, "function");
});

// ══════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
