import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("product detail uses a centered safe-area modal with a dark viewport backdrop", async () => {
  const detail = await source("../components/product-detail-dialog.tsx");

  assert.match(detail, /max-h-\[85dvh\]/);
  assert.match(detail, /safe-area-inset-top/);
  assert.match(detail, /safe-area-inset-bottom/);
  assert.match(detail, /bg-black\/80/);
  assert.match(detail, /animated=\{false\}/);
  assert.doesNotMatch(detail, /mobileNearFullscreen/);
});

test("dialog keeps header and footer outside its scrollable content and restores background scroll", async () => {
  const dialog = await source("../components/ui/dialog.tsx");
  const headerIndex = dialog.indexOf('className="flex items-center justify-between border-b');
  const contentIndex = dialog.indexOf("overflow-y-auto");
  const footerIndex = dialog.indexOf('border-t border-divider');

  assert.ok(headerIndex >= 0 && contentIndex > headerIndex && footerIndex > contentIndex);
  assert.match(dialog, /document\.body\.style\.position = "fixed"/);
  assert.match(dialog, /useLayoutEffect/);
  assert.match(dialog, /scrollbarWidth/);
  assert.match(dialog, /paddingRight/);
  assert.match(dialog, /window\.scrollTo\(0, scrollY\)/);
});

test("dialog uses a coordinated opacity-only fade and respects reduced motion", async () => {
  const dialog = await source("../components/ui/dialog.tsx");

  assert.match(dialog, /useReducedMotion/);
  assert.match(dialog, /duration: reduceMotion \? 0 : animation\.motion\.base/);
  assert.doesNotMatch(dialog, /initial=\{\{[^}]*\b(?:x|y|scale):/);
  assert.doesNotMatch(dialog, /animate=\{\{[^}]*\b(?:x|y|scale):/);
});

test("product detail can bypass Framer Motion and AnimatePresence entirely", async () => {
  const dialog = await source("../components/ui/dialog.tsx");

  assert.match(dialog, /if \(!animated\)/);
  assert.match(dialog, /if \(!open\) return null/);
  assert.match(dialog, /<div role="dialog"/);
});

test("PAO displays months only for a positive integer", async () => {
  const detail = await source("../components/product-detail-dialog.tsx");

  assert.match(detail, /Number\.isInteger\(product\.pao_months\)/);
  assert.match(detail, /product\.pao_months \?\? 0\) > 0/);
  assert.match(detail, /"未設定"/);
});
