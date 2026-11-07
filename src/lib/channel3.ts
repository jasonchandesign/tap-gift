export type Offer = {
  url?: string;
  domain?: string;
  price?: { price?: number; currency?: string };
  availability?: string;
  condition?: string;
};

export type VariantOption = {
  name?: string;
  values?: {
    label?: string;
    exists?: boolean;
    available?: string | null;
    /** A photo of the product in this color or style. */
    thumbnail_url?: string;
  }[];
};

export type Product = {
  id: string;
  title: string;
  description?: string | null;
  age?: string | null;
  brands?: { name?: string }[];
  images?: { url?: string; is_main_image?: boolean }[];
  category?: { slug?: string; title?: string; path?: string[] | string } | null;
  offers?: Offer[];
  variants?: { options?: VariantOption[] } | null;
};

export async function searchProducts(query: string, maxDollars: number): Promise<Product[]> {
  const response = await fetch("https://api.trychannel3.com/v1/search", {
    method: "POST",
    headers: {
      "x-api-key": process.env.CHANNEL3_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      filters: { price: { max_price: maxDollars }, availability: ["InStock"] },
      limit: 10,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Channel3 search failed with ${response.status}`);
  const data = (await response.json()) as { products?: Product[] };
  return data.products ?? [];
}

/** Returns the latest offers for one product, or null if it's gone. */
export async function getProduct(id: string): Promise<Product | null> {
  const response = await fetch(`https://api.trychannel3.com/v1/products/${encodeURIComponent(id)}`, {
    headers: { "x-api-key": process.env.CHANNEL3_API_KEY ?? "" },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Channel3 lookup failed with ${response.status}`);
  return (await response.json()) as Product;
}
