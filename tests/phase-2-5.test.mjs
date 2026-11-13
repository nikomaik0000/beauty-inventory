import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("desktop pages share one header navigation without the admin sidebar", async () => {
  const [header, adminLayout, settings] = await Promise.all([
    source("../components/site-header.tsx"),
    source("../app/admin/layout.tsx"),
    source("../app/admin/settings/page.tsx"),
  ]);

  for (const href of ['href: "/"', 'href: "/admin/categories"', 'href: "/admin/brands"', 'href: "/admin/settings"']) {
    assert.match(header, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(header, /usePathname/);
  assert.match(header, /aria-current/);
  assert.doesNotMatch(adminLayout, /AdminSidebar/);
  assert.doesNotMatch(header, /SignOutButton|登出/);
  assert.match(settings, /SignOutButton/);
});

test("mobile navigation keeps its hit area while normalizing icon geometry", async () => {
  const navigation = await source("../components/mobile-bottom-nav.tsx");

  assert.match(navigation, /size=\{19\}/);
  assert.match(navigation, /strokeWidth=\{1\.8\}/);
  assert.match(navigation, /min-h-12/);
  assert.match(navigation, /safe-area-inset-bottom/);
  assert.match(navigation, /visualViewport/);
});

test("mobile cards discriminate vertical scrolling and expose bounded swipe actions", async () => {
  const [card, explorer, swipeActions, menu] = await Promise.all([
    source("../components/product-card-grid.tsx"),
    source("../components/product-explorer.tsx"),
    source("../components/product-swipe-actions.tsx"),
    source("../components/product-actions-menu.tsx"),
  ]);

  assert.match(card, /absX > absY \* 1\.2/);
  assert.match(card, /absY > absX \* 1\.2/);
  assert.match(card, /Math\.max\(\s*-SWIPE_ACTION_WIDTH/);
  assert.match(card, /touch-pan-y/);
  assert.match(card, /sm:!translate-x-0/);
  assert.match(card, /suppressOpenRef/);
  assert.match(explorer, /openSwipeProductId/);
  assert.match(explorer, /data-product-swipe-card/);
  assert.match(swipeActions, /編輯/);
  assert.match(swipeActions, /複製/);
  assert.match(swipeActions, /刪除/);
  assert.match(swipeActions, /confirm\(/);
  assert.match(swipeActions, /grid-cols-3/);
  assert.match(card, /SWIPE_ACTION_WIDTH = 192/);
  assert.match(card, /hidden sm:block/);
  assert.match(menu, /duplicate/);
  assert.match(menu, /size=\{16\}/);
  assert.match(menu, /h-9 w-9/);
  assert.match(menu, /bg-transparent/);
  assert.match(menu, /hover:bg-accentSoft/);
});

test("taxonomy pages use responsive desktop grids without narrow fixed wrappers", async () => {
  const [categories, brands, entityList] = await Promise.all([
    source("../app/admin/categories/page.tsx"),
    source("../app/admin/brands/page.tsx"),
    source("../components/admin/simple-entity-list.tsx"),
  ]);

  assert.match(categories, /grid-cols-1/);
  assert.match(categories, /lg:grid-cols-2/);
  assert.doesNotMatch(categories, /max-w-2xl/);
  assert.doesNotMatch(brands, /max-w-lg/);
  assert.match(entityList, /grid-cols-1/);
  assert.match(entityList, /md:grid-cols-2/);
  assert.match(entityList, /lg:grid-cols-3/);
});

test("product sorting stays deterministic across server and browser hydration", async () => {
  const explorer = await source("../components/product-explorer.tsx");

  assert.match(explorer, /compareTextStable/);
  assert.doesNotMatch(explorer, /localeCompare/);
});
