import { createHmac } from "node:crypto";

/**
 * 쿠팡 파트너스 Open API - 딥링크 생성.
 * https://developers.coupangcorp.com (CEA HMAC 인증)
 */
const HOST = "https://api-gateway.coupang.com";
const DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

export function coupangAuthHeader(method: string, pathWithQuery: string, accessKey: string, secretKey: string, now = new Date()) {
  const [path, query = ""] = pathWithQuery.split("?");
  const iso = now.toISOString(); // 2026-09-29T02:43:00.000Z → 260929T024300Z
  const signedDate = `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
  const signature = createHmac("sha256", secretKey).update(signedDate + method + path + query).digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

export async function createCoupangDeeplink(productUrl: string): Promise<string | null> {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!accessKey || !secretKey) return null;
  const res = await fetch(HOST + DEEPLINK_PATH, {
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
      authorization: coupangAuthHeader("POST", DEEPLINK_PATH, accessKey, secretKey),
    },
    body: JSON.stringify({ coupangUrls: [productUrl] }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { rCode?: string; data?: { landingUrl?: string; shortenUrl?: string }[] };
  // landingUrl에는 subid 파라미터가 있어 클릭마다 값을 바꿔 전환 추적에 쓴다.
  return json.data?.[0]?.landingUrl ?? json.data?.[0]?.shortenUrl ?? null;
}
