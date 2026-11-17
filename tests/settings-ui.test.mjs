import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("settings uses one left-aligned column with JSON open by default", async () => {
  const [page, section] = await Promise.all([
    source("../app/admin/settings/page.tsx"),
    source("../components/admin/settings-section.tsx"),
  ]);

  assert.match(page, /w-full min-w-0/);
  assert.match(page, /mt-6 w-full space-y-6/);
  assert.doesNotMatch(page, /max-w-\[1080px\]/);
  assert.doesNotMatch(page, /mx-auto mt-6/);
  const jsonIndex = page.indexOf('title="JSON 匯入／匯出"');
  const backupIndex = page.indexOf('title="商品快照與還原"');
  const storageIndex = page.indexOf('title="儲存空間維護"');
  assert.ok(jsonIndex >= 0 && backupIndex > jsonIndex && storageIndex > backupIndex);
  assert.match(page.slice(jsonIndex, backupIndex), /defaultOpen/);
  assert.doesNotMatch(page.slice(backupIndex, storageIndex), /defaultOpen/);
  assert.doesNotMatch(page, /資料、帳號與儲存空間管理/);

  assert.match(section, /<details open=\{defaultOpen\} className="group/);
  assert.match(section, /<summary/);
  assert.match(section, /defaultOpen = false/);
  assert.doesNotMatch(section, /useState|AnimatePresence|motion\./);
  assert.match(section, /px-6 py-6/);
  assert.match(section, /sm:px-7 sm:pb-7/);
  assert.match(section, /group-open:rotate-180/);
  assert.doesNotMatch(section, /shadow/);
});

test("settings content keeps actions and warnings while removing repeated copy", async () => {
  const [json, backups, storage] = await Promise.all([
    source("../components/admin/json-data-manager.tsx"),
    source("../components/admin/inventory-backup-manager.tsx"),
    source("../components/admin/storage-maintenance.tsx"),
  ]);

  for (const label of ["JSON 範例", "匯出全部商品", "新增", "更新", "取代", "選擇 JSON 檔案", "產生差異預覽", "確認匯入"]) {
    assert.match(json, new RegExp(label));
  }
  assert.match(json, /grid grid-cols-3 gap-2/);
  assert.match(json, /取代模式可能刪除/);
  assert.doesNotMatch(json, /圖片 object path|匯入差異預覽|目前模式：/);
  assert.doesNotMatch(json, /只預覽尚不存在|只比較已存在|同時預覽新增/);

  assert.match(backups, /還原預覽/);
  assert.match(backups, /還原會覆蓋目前商品資料/);
  assert.match(backups, /快照不包含 Storage 圖片實體檔案/);
  assert.match(backups, /影響 \{backup\.affectedCount\} 件/);
  assert.doesNotMatch(backups, /商品 \{backup\.productCount\}|圖片引用 \{backup\.imageReferenceCount\}/);
  assert.doesNotMatch(backups, /每次異動前自動建立資料庫快照/);

  assert.match(storage, /掃描未使用的圖片/);
  assert.match(storage, /deleteOrphanedImages/);
  assert.doesNotMatch(storage, /掃描圖片儲存空間，找出/);
});

