import { safeFetch } from "../net";

/**
 * 공유된 쇼핑 링크를 정규화한다.
 * - 다른 사람의 제휴/추적 파라미터를 제거해 "링크 하이재킹"을 막고
 * - 같은 상품이 같은 canonical URL을 갖게 해서 중복 탐지/가격 히스토리에 쓴다.
 */

// 제거 대상: 광고/추적/타 제휴 파라미터
const STRIP_EXACT = new Set([
  "fbclid", "gclid", "dclid", "msclkid", "igshid", "yclid", "_ga", "ref", "ref_",
  "lptag", "subid", "subId", "sub_id", "traceid", "clickid", "click_id", "trackingid",
  "affiliate", "affiliate_id", "aff_id", "aff_platform", "aff_trace_key", "aff_fcid", "aff_fsk",
  "sk", "terminal_id", "tag", "ascsubtag", "linkcode", "linkid", "creative", "creativeasin",
  "spm", "scm", "pvid", "algo_pvid", "algo_expid", "btsid", "ws_ab_test", "gatewayadapt",
  "napm", "nacn", "nt_source", "nt_medium", "nt_detail", "nt_keyword",
  "sourcetype", "src", "addtag", "ctag", "wpcid", "wpsrc", "wptype", "wref", "platform",
  "redirect", "isaddedcart", "pagekey", "ctrid", "wtsid",
]);
const STRIP_PREFIX = ["utm_", "aff_", "af_", "mc_", "n_", "srsltid", "_trk"];

// 머천트별로 "상품 식별에 필요한 파라미터"만 남기는 화이트리스트 (없으면 블랙리스트 방식)
const KEEP_ONLY: Record<string, string[]> = {
  "coupang.com": ["itemId", "vendorItemId"],
  "11st.co.kr": ["prdNo"],
  "gmarket.co.kr": ["goodscode", "goodsCode"],
  "auction.co.kr": ["itemno", "itemNo"],
  "ssg.com": ["itemId", "siteNo"],
  "lotteon.com": [],
  "musinsa.com": [],
  "aliexpress.com": [],
  "amazon.com": [],
};

export class InvalidUrlError extends Error {}

export function parseShoppingUrl(raw: string): URL {
  const trimmed = raw.trim().match(/https?:\/\/[^\s"'<>]+/)?.[0];
  if (!trimmed) throw new InvalidUrlError("링크를 찾을 수 없어요");
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new InvalidUrlError("올바른 링크가 아니에요");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new InvalidUrlError("http(s) 링크만 가능해요");
  if (isPrivateHost(u.hostname)) throw new InvalidUrlError("허용되지 않는 주소예요");
  return u;
}

/** SSRF 방지: 내부망/로컬 주소로의 서버 fetch 금지 */
export function isPrivateHost(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h.includes(":")) return true; // IPv6 리터럴은 전부 차단
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

function rootDomain(hostname: string) {
  return Object.keys(KEEP_ONLY).find((d) => hostname === d || hostname.endsWith(`.${d}`));
}

export function canonicalize(input: string | URL): string {
  const u = new URL(typeof input === "string" ? parseShoppingUrl(input).toString() : input.toString());
  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  u.protocol = "https:";
  // 모바일/데스크탑 도메인 통일
  u.hostname = u.hostname.replace(/^(m|mw|www|mobile)\.(?=[^.]+\.[^.]+)/, "www.");
  if (u.hostname.endsWith("coupang.com")) u.hostname = "www.coupang.com";
  if (u.hostname.endsWith("coupang.com")) u.pathname = u.pathname.replace(/^\/vm\//, "/vp/");

  const root = rootDomain(u.hostname);
  const keep = root ? KEEP_ONLY[root] : undefined;
  for (const key of [...u.searchParams.keys()]) {
    const lower = key.toLowerCase();
    const drop = keep && keep.length
      ? !keep.includes(key)
      : STRIP_EXACT.has(key) || STRIP_EXACT.has(lower) || STRIP_PREFIX.some((p) => lower.startsWith(p));
    if (drop) u.searchParams.delete(key);
  }
  if (keep && keep.length === 0) u.search = "";
  u.searchParams.sort();
  // 아마존: /dp/ASIN 형태로 축약
  const asin = u.hostname.includes("amazon.") && u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1];
  if (asin) {
    u.pathname = `/dp/${asin.toUpperCase()}`;
    u.search = "";
  }
  return u.toString().replace(/\?$/, "");
}

const SHORTENER_HOSTS = [
  "link.coupang.com", "coupa.ng", "s.click.aliexpress.com", "a.aliexpress.com",
  "naver.me", "amzn.to", "amzn.asia", "bit.ly", "han.gl", "t.co", "vo.la", "me2.do",
  "click.linkprice.com", "lpweb.kr",
];

export function isShortener(u: URL) {
  return SHORTENER_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
}

/**
 * 단축/제휴 링크를 따라가 실제 상품 URL을 얻는다. (타인의 제휴 링크 → 원본 상품 → 내 제휴 링크)
 * 링크프라이스처럼 목적지를 파라미터로 가진 경우는 네트워크 요청 없이 푼다.
 */
export async function resolveRedirects(input: URL, maxHops = 6): Promise<URL> {
  let current = input;
  for (let i = 0; i < maxHops; i++) {
    const embedded = embeddedTarget(current);
    if (embedded) {
      current = embedded;
      continue;
    }
    if (!isShortener(current)) return current;
    let res: Response;
    try {
      res = await safeFetch(current, { redirect: "manual", timeoutMs: 4000 });
    } catch {
      return current;
    }
    const loc = res.headers.get("location");
    if (!loc) return current;
    current = new URL(loc, current);
  }
  return current;
}

function embeddedTarget(u: URL): URL | null {
  const keys = ["tu", "dl_target_url", "target", "url", "redirectUrl", "returnUrl"];
  if (!isShortener(u) && !u.hostname.includes("linkprice")) return null;
  for (const k of keys) {
    const v = u.searchParams.get(k);
    if (v && /^https?:\/\//i.test(v)) {
      try {
        return new URL(v);
      } catch {}
    }
  }
  return null;
}

