import { InventoryAccessError, requireInventoryUser } from "@/lib/inventory-auth";
import { extractProductImagePath, PRODUCT_IMAGE_BUCKET } from "@/lib/product-image-path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_IMAGE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  try {
    const { supabase } = await requireInventoryUser();
    const requestedPath = new URL(request.url).searchParams.get("path");
    const path = extractProductImagePath(requestedPath);

    if (!path) {
      return Response.json({ error: "無效的圖片路徑。" }, { status: 400, headers: PRIVATE_IMAGE_HEADERS });
    }

    const { data, error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).download(path);
    if (error || !data) {
      return Response.json({ error: "找不到圖片。" }, { status: 404, headers: PRIVATE_IMAGE_HEADERS });
    }

    return new Response(data, {
      status: 200,
      headers: {
        ...PRIVATE_IMAGE_HEADERS,
        "Content-Type": data.type || "image/webp",
        "Content-Length": String(data.size),
      },
    });
  } catch (error) {
    if (error instanceof InventoryAccessError) {
      return Response.json({ error: error.message }, { status: error.status, headers: PRIVATE_IMAGE_HEADERS });
    }
    return Response.json({ error: "圖片讀取失敗。" }, { status: 500, headers: PRIVATE_IMAGE_HEADERS });
  }
}

