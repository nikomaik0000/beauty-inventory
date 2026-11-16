import type { JsonPreviewResult } from "./product-json";

export interface InventoryBackupSummary {
  id: string;
  createdAt: string;
  operation: "add" | "update" | "replace" | "restore";
  productCount: number;
  affectedCount: number;
  imageReferenceCount: number;
}

export interface InventoryBackupListResult {
  installed: boolean;
  reason: string | null;
  backups: InventoryBackupSummary[];
}

export interface InventoryCommitResult {
  status: "applied" | "already-applied";
  operation: "add" | "update" | "replace" | "restore";
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  backupId: string;
}

export interface InventoryRestorePreview {
  preview: JsonPreviewResult;
  execution: {
    enabled: boolean;
    previewToken: string | null;
    expiresAt: string | null;
    reason: string | null;
  };
}
