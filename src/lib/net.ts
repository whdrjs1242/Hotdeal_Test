import { lookup } from "node:dns/promises";
import { isPrivateHost } from "./affiliate/url";

export const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/**
 * 사용자 입력 URL을 서버에서 가져올 때 쓰는 fetch. 내부망 주소(DNS 결과 포함)를 차단한다(SSRF 방어).
 * redirect는 manual로만 허용하고 호출자가 hop마다 다시 검증한다.
 */
export async function safeFetch(
  url: URL,
  opts: { redirect?: "manual"; timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<Response> {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("blocked protocol");
  if (isPrivateHost(url.hostname)) throw new Error("blocked host");
  const addrs = await lookup(url.hostname, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("blocked address");
  return fetch(url, {
    redirect: opts.redirect ?? "manual",
    headers: { "user-agent": MOBILE_UA, "accept-language": "ko-KR,ko;q=0.9", ...opts.headers },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
  });
}

function isPrivateIp(ip: string) {
  const v = ip.toLowerCase();
  if (!v.includes(":")) return isPrivateHost(v);
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPrivateHost(mapped);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
}
