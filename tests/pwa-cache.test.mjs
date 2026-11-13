import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clearInventoryCaches } from "../lib/clear-inventory-caches.ts";
import { isProtectedRuntimeRequest } from "../lib/pwa-runtime-cache.mjs";

function request(mode = "cors", rsc = null) {
  return { mode, headers: { get: (name) => (name === "RSC" ? rsc : null) } };
}

test("navigations, RSC, API, image proxy, and Supabase traffic bypass caches", () => {
  assert.equal(
    isProtectedRuntimeRequest({ url: new URL("https://app.example/"), request: request("navigate") }),
    true,
  );
  assert.equal(
    isProtectedRuntimeRequest({ url: new URL("https://app.example/?_rsc=abc"), request: request() }),
    true,
  );
  assert.equal(
    isProtectedRuntimeRequest({ url: new URL("https://app.example/api/product-images?path=x"), request: request() }),
    true,
  );
  assert.equal(
    isProtectedRuntimeRequest({ url: new URL("https://project.supabase.co/rest/v1/products"), request: request() }),
    true,
  );
  assert.equal(
    isProtectedRuntimeRequest({ url: new URL("https://app.example/_next/static/chunk.js"), request: request() }),
    false,
  );
});

test("logout cache cleanup deletes old and new cache names", async () => {
  const deleted = [];
  const storage = {
    async keys() {
      return ["others", "next-image", "public-next-static"];
    },
    async delete(name) {
      deleted.push(name);
      return true;
    },
  };

  assert.equal(await clearInventoryCaches(storage), 3);
  assert.deepEqual(deleted, ["others", "next-image", "public-next-static"]);
});

test("cache cleanup is safe when Cache Storage is unavailable", async () => {
  assert.equal(await clearInventoryCaches(undefined), 0);
});

test("the custom worker removes legacy private runtime caches on activation", async () => {
  const source = await readFile(new URL("../worker/index.js", import.meta.url), "utf8");
  for (const cacheName of ["others", "apis", "next-data", "next-image", "cross-origin"]) {
    assert.match(source, new RegExp(`"${cacheName}"`));
  }
  assert.match(source, /addEventListener\("activate"/);
});

