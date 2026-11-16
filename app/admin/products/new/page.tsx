import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ duplicate?: string }> }) {
  const { duplicate } = await searchParams;
  redirect(duplicate ? `/?productForm=duplicate:${encodeURIComponent(duplicate)}` : "/?productForm=new");
}
