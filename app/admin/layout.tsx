import { SiteHeader } from "@/components/site-header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requireInventoryUser } from "@/lib/inventory-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireInventoryUser({ redirectToLogin: true });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:gap-6 sm:px-6 sm:pb-12 sm:pt-8">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
