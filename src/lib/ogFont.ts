/**
 * OG 이미지(공유 카드)용 한글 폰트. Google Fonts에서 필요한 글자만 서브셋으로 받아 메모리에 캐시한다.
 * 실패 시 undefined → 기본 폰트로 렌더(한글 깨짐 방지를 위해 운영에선 폰트 파일을 번들하는 것을 권장).
 */
const cache = new Map<string, ArrayBuffer>();

export async function loadKoreanFont(text: string, weight = 800): Promise<ArrayBuffer | undefined> {
  const chars = Array.from(new Set(text)).join("");
  const key = `${weight}:${chars}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(chars)}`, {
        signal: AbortSignal.timeout(3000),
      })
    ).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/)?.[1];
    if (!src) return undefined;
    const buf = await (await fetch(src, { signal: AbortSignal.timeout(3000) })).arrayBuffer();
    if (cache.size > 200) cache.clear();
    cache.set(key, buf);
    return buf;
  } catch {
    return undefined;
  }
}
