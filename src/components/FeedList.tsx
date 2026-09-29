"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DealCard as Deal } from "@/lib/deals";
import { DealCard } from "./DealCard";

/**
 * 무한 스크롤 피드. 첫 페이지는 서버 렌더(SEO/빠른 첫 화면), 이후는 커서 API.
 */
export function FeedList({
  initial,
  initialCursor,
  query,
  children,
}: {
  initial: Deal[];
  initialCursor: string | null;
  query: string;
  children?: React.ReactNode;
}) {
  const [items, setItems] = useState<Deal[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems([]);
    setCursor(initialCursor);
  }, [query, initialCursor]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/deals?${query}&cursor=${encodeURIComponent(cursor)}`);
      const data = (await res.json()) as { items: Deal[]; nextCursor: string | null };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <>
      {children}
      {items.map((d, i) => (
        <DealCard key={d.id} deal={d} rank={initial.length + i} />
      ))}
      <div ref={sentinel} className="bg-canvas py-6 text-center text-[13px] text-muted">
        {loading ? "불러오는 중" : cursor ? "" : initial.length + items.length > 0 ? "마지막 딜이에요" : ""}
      </div>
    </>
  );
}
