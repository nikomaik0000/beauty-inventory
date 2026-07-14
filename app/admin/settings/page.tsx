import { LogOut } from "lucide-react";
import { StorageMaintenance } from "@/components/admin/storage-maintenance";
import { signOut } from "@/app/actions/auth";

export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-serif text-xl font-semibold text-textPrimary">設定</h1>
        <p className="mt-1 text-sm text-textMuted">帳號與儲存空間管理。</p>
      </div>

      <StorageMaintenance />

      <div className="border-t border-divider pt-6">
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-input border border-border bg-surface px-3.5 py-2 text-sm font-medium text-textSecondary transition-colors hover:bg-surfaceMuted"
          >
            <LogOut size={20} strokeWidth={1.75} />
            登出
          </button>
        </form>
      </div>
    </div>
  );
}
