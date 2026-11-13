import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { requireInventoryUser } from "@/lib/inventory-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireInventoryUser({ redirectToLogin: true });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-12 sm:pt-8">
        <div className="min-w-0">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
