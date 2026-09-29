"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BountyCard as Bounty } from "@/lib/bounties";
import { BountyCard } from "./BountyCard";

export function BountyFeed({ initialCursor, query, children }: { initialCursor: string | null; query: string; children: React.ReactNode }) {
  const [items, setItems] = useState<Bounty[]>([]);
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
      const res = await fetch(`/api/bounties?${query}&cursor=${encodeURIComponent(cursor)}`);
      const data = (await res.json()) as { items: Bounty[]; nextCursor: string | null };
      setItems((p) => [...p, ...data.items]);
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
      {items.map((b) => (
        <BountyCard key={b.id} bounty={b} />
      ))}
      <div ref={sentinel} className="bg-canvas py-5 text-center text-[13px] text-muted">
        {loading ? "불러오는 중" : ""}
      </div>
    </>
  );
}
