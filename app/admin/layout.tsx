import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 overflow-x-hidden px-4 py-4 sm:flex-row sm:gap-6 sm:px-6 sm:py-8">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
