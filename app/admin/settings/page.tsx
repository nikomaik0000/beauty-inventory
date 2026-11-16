import { LogOut } from "lucide-react";
import { JsonDataManager } from "@/components/admin/json-data-manager";
import { StorageMaintenance } from "@/components/admin/storage-maintenance";
import { SignOutButton } from "@/components/sign-out-button";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-textPrimary">設定</h1>
        <p className="mt-1 text-sm text-textMuted">資料、帳號與儲存空間管理。</p>
      </div>

      <JsonDataManager />

      <StorageMaintenance />

      <div className="border-t border-divider pt-6">
          <SignOutButton
            className="flex items-center gap-2 rounded-input border border-border bg-surface px-3.5 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <LogOut size={20} strokeWidth={1.75} />
            登出
          </SignOutButton>
      </div>
    </div>
  );
}
