import { DatabaseBackup, FileJson, HardDrive, LogOut } from "lucide-react";
import { JsonDataManager } from "@/components/admin/json-data-manager";
import { InventoryBackupManager } from "@/components/admin/inventory-backup-manager";
import { SettingsSection } from "@/components/admin/settings-section";
import { StorageMaintenance } from "@/components/admin/storage-maintenance";
import { SignOutButton } from "@/components/sign-out-button";

export default function SettingsPage() {
  return (
    <div className="w-full min-w-0">
      <h1 className="text-xl font-semibold text-textPrimary">設定</h1>

      <div className="mt-6 w-full space-y-6">
        <SettingsSection
          title="JSON 匯入／匯出"
          icon={<FileJson size={20} strokeWidth={1.75} />}
          defaultOpen
        >
          <JsonDataManager />
        </SettingsSection>

        <SettingsSection
          title="商品快照與還原"
          icon={<DatabaseBackup size={20} strokeWidth={1.75} />}
        >
          <InventoryBackupManager />
        </SettingsSection>

        <SettingsSection
          title="儲存空間維護"
          icon={<HardDrive size={20} strokeWidth={1.75} />}
        >
          <StorageMaintenance />
        </SettingsSection>

        <div className="border-t border-divider pt-6">
          <SignOutButton
            className="flex items-center gap-2 rounded-input border border-border bg-surface px-3.5 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <LogOut size={20} strokeWidth={1.75} />
            登出
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
