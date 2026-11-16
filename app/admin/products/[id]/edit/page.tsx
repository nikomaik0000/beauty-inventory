import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/?productForm=edit:${encodeURIComponent(id)}`);
}
