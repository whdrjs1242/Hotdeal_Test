export function won(n: number | null | undefined) {
  return n == null ? "" : `${n.toLocaleString("ko-KR")}원`;
}

export function timeAgo(input: string | Date) {
  const diff = (Date.now() - new Date(input).getTime()) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(input).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function compact(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return String(n);
}
