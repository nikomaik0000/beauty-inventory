import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("product detail uses a centered safe-area modal with the shared 50% viewport backdrop", async () => {
  const [detail, dialog] = await Promise.all([
    source("../components/product-detail-dialog.tsx"),
    source("../components/ui/dialog.tsx"),
  ]);

  assert.match(detail, /max-h-\[85dvh\]/);
  assert.match(detail, /safe-area-inset-top/);
  assert.match(detail, /safe-area-inset-bottom/);
  assert.match(dialog, /bg-black\/50/);
  assert.match(dialog, /createPortal\(dialog, document\.body\)/);
  assert.doesNotMatch(detail, /mobileNearFullscreen/);
});

test("dialog keeps header and footer outside its scrollable content and restores background scroll", async () => {
  const dialog = await source("../components/ui/dialog.tsx");
  const headerIndex = dialog.indexOf('className="flex items-center justify-between border-b');
  const contentIndex = dialog.indexOf("overflow-y-auto");
  const footerIndex = dialog.indexOf('border-t border-divider');

  assert.ok(headerIndex >= 0 && contentIndex > headerIndex && footerIndex > contentIndex);
  assert.match(dialog, /document\.documentElement\.style\.overflow = "hidden"/);
  assert.match(dialog, /document\.body\.style\.overflow = "hidden"/);
  assert.match(dialog, /useLayoutEffect/);
  assert.match(dialog, /widthBeforeLock/);
  assert.match(dialog, /layoutShift/);
  assert.doesNotMatch(dialog, /document\.body\.style\.position = "fixed"/);
  assert.doesNotMatch(dialog, /window\.scrollTo\(0, bodyLockScrollY\)/);
  assert.match(dialog, /bodyLockCount/);
  assert.match(dialog, /previouslyFocused\.focus\(\{ preventScroll: true \}\)/);
});

test("shared dropdown positions and highlights before paint without a lingering exit overlay", async () => {
  const [dropdown, menu, sort, filter] = await Promise.all([
    source("../components/ui/dropdown.tsx"),
    source("../components/product-actions-menu.tsx"),
    source("../components/sort-menu.tsx"),
    source("../components/filter-panel.tsx"),
  ]);

  assert.match(dropdown, /const nextPosition = calculatePosition\(\)/);
  assert.ok(dropdown.indexOf("setHighlightedIndex") < dropdown.indexOf("setOpen(true)"));
  assert.ok(dropdown.indexOf("setPosition(nextPosition)") < dropdown.indexOf("setOpen(true)"));
  assert.doesNotMatch(dropdown, /scrollIntoView|AnimatePresence|motion\./);
  assert.match(dropdown, /list\.scrollTop/);
  assert.match(menu, /PRODUCT_ACTION_OPTIONS/);
  assert.match(sort, /<Dropdown/);
  assert.doesNotMatch(sort, /AnimatePresence|motion\.|position: "absolute"/);
  assert.ok(filter.indexOf("setDraft(filters)") < filter.indexOf("setOpen(true)"));
});

test("dialog portals once and keeps nested focus and Escape handling on the top layer", async () => {
  const dialog = await source("../components/ui/dialog.tsx");

  assert.match(dialog, /portalReady \? createPortal\(dialog, document\.body\)/);
  assert.match(dialog, /dialogStack\.at\(-1\) !== currentDialogId/);
  assert.match(dialog, /onCloseRef\.current\(\)/);
  assert.match(dialog, /getFocusableElements/);
  assert.match(dialog, /e\.key !== "Tab"/);
  assert.doesNotMatch(dialog, /AnimatePresence|motion\.|useReducedMotion/);
  assert.match(dialog, /if \(!open\) return null/);
});

test("PAO displays months only for a positive integer", async () => {
  const detail = await source("../components/product-detail-dialog.tsx");

  assert.match(detail, /Number\.isInteger\(product\.pao_months\)/);
  assert.match(detail, /product\.pao_months \?\? 0\) > 0/);
  assert.match(detail, /"未設定"/);
});
