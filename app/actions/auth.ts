"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { evaluateInventoryAccess } from "@/lib/inventory-access";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const decision = evaluateInventoryAccess(data.user?.id, process.env.INVENTORY_ALLOWED_USER_IDS);
  if (!decision.allowed) {
    await supabase.auth.signOut();
    throw new Error(
      decision.reason === "allowlist-not-configured"
        ? "Beauty Inventory 尚未設定指定帳號。"
        : "這個帳號沒有 Beauty Inventory 的使用權限。",
    );
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
