import { safeFetch } from "./net";

export interface ProductMeta {
  title?: string;
  image?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
}

const MAX_BYTES = 1_500_000;

/** 상품 페이지의 OG 태그 / JSON-LD 에서 제목·이미지·가격을 추출한다. 실패해도 빈 객체. */
export async function fetchProductMeta(url: string): Promise<ProductMeta> {
  try {
    let current = new URL(url);
    let res: Response | undefined;
    for (let hop = 0; hop < 5; hop++) {
      res = await safeFetch(current, { timeoutMs: 5000, headers: { accept: "text/html" } });
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!loc) break;
      current = new URL(loc, current);
    }
    if (!res || !res.ok || !res.body) return {};
    const html = await readLimited(res.body, MAX_BYTES);
    return parseProductMeta(html, current);
  } catch {
    return {};
  }
}

async function readLimited(body: ReadableStream<Uint8Array>, limit: number) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < limit) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

function meta(html: string, ...names: string[]) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${name}["']`,
      "i",
    );
    const m = html.match(re);
    if (m) return decodeEntities(m[1] ?? m[2]);
  }
  return undefined;
}

export function parsePrice(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function parseProductMeta(html: string, base: URL): ProductMeta {
  const out: ProductMeta = {
    title: meta(html, "og:title", "twitter:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim(),
    image: meta(html, "og:image", "og:image:url", "twitter:image"),
    description: meta(html, "og:description", "description"),
    price: parsePrice(meta(html, "product:price:amount", "og:price:amount", "price")),
    originalPrice: parsePrice(meta(html, "product:original_price:amount")),
  };
  // JSON-LD Product
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const nodes: Record<string, unknown>[] = (Array.isArray(data) ? data : data["@graph"] ?? [data]).flat();
      const product = nodes.find((n) => String(n?.["@type"]).includes("Product"));
      if (!product) continue;
      out.title ??= product.name as string | undefined;
      const img = product.image;
      out.image ??= (Array.isArray(img) ? img[0] : img) as string | undefined;
      const offers = product.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      out.price ??= parsePrice(offer?.price ?? offer?.lowPrice);
    } catch {}
  }
  if (out.title) out.title = decodeEntities(out.title).slice(0, 200);
  if (out.image) {
    try {
      out.image = new URL(out.image, base).toString();
    } catch {
      delete out.image;
    }
  }
  return out;
}
