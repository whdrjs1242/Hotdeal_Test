"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Preview {
  canonicalUrl: string;
  merchant: { name: string };
  meta: { title?: string; image?: string; price?: number; originalPrice?: number; category: string };
}

/** 헌터: 수배 상품 발견 등록 */
export function HuntForm({ bountyId, category, loggedIn, targetPrice }: { bountyId: number; category: string; loggedIn: boolean; targetPrice: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [p, setP] = useState<Preview | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(target = url) {
    if (!target.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/deals/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: target }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error);
    setP(d);
    setTitle(d.meta.title ?? "");
    setPrice(d.meta.price ? String(d.meta.price) : "");
  }

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: p?.canonicalUrl ?? url,
        title,
        price: price ? Number(price.replace(/[^\d]/g, "")) : null,
        originalPrice: p?.meta.originalPrice ?? null,
        imageUrl: p?.meta.image ?? null,
        category,
        bountyId,
      }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "등록에 실패했어요");
    setOpen(false);
    setP(null);
    setUrl("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => (loggedIn ? setOpen(true) : router.push(`/login?next=/bounties/${bountyId}`))}
        className="h-12 w-full rounded-xl border-2 border-dashed border-[#c2410c] text-sm font-black text-[#c2410c]"
      >
        🕵️ 내가 찾았다! 발견 상품 올리기
      </button>
    );
  }
  const numPrice = Number(price.replace(/[^\d]/g, "")) || 0;
  return (
    <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <div className="text-sm font-bold">🕵️ 발견 상품 올리기</div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (t) setTimeout(() => load(t), 0);
          }}
          placeholder="상품 링크 붙여넣기"
          inputMode="url"
          className="h-10 min-w-0 flex-1 rounded-lg bg-canvas px-3 text-sm outline-none"
        />
        <button onClick={() => load()} disabled={busy} className="h-10 rounded-lg bg-ink px-3 text-sm font-bold text-surface">
          불러오기
        </button>
      </div>
      {p && (
        <>
          <div className="flex gap-3">
            {p.meta.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.meta.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div className="flex-1 space-y-1.5">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="상품명" className="h-9 w-full rounded-lg bg-canvas px-2 text-sm outline-none" />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="가격(원)" inputMode="numeric" className="h-9 w-full rounded-lg bg-canvas px-2 text-sm outline-none" />
            </div>
          </div>
          <p className="text-xs text-sub">
            {p.merchant.name}
            {targetPrice && numPrice > 0 && (numPrice <= targetPrice ? " · ✓ 목표가 달성!" : ` · 목표가보다 ${(numPrice - targetPrice).toLocaleString()}원 비싸요`)}
          </p>
          <button onClick={submit} disabled={busy || title.length < 2} className="h-11 w-full rounded-xl bg-[#c2410c] text-sm font-bold text-white disabled:opacity-40">
            {busy ? "등록 중…" : "발견 상품 등록"}
          </button>
        </>
      )}
      {error && <p className="text-xs font-semibold text-brand">{error}</p>}
    </div>
  );
}
