"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Img } from "@/components/Img";

interface Preview {
  canonicalUrl: string;
  merchant: { name: string };
  meta: { title?: string; image?: string; price?: number; originalPrice?: number; category: string };
}

/** 찾은 상품 올리기 (헌터) */
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
    if (!res.ok) return setError(d.error ?? "등록하지 못했어요");
    setOpen(false);
    setP(null);
    setUrl("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => (loggedIn ? setOpen(true) : router.push(`/login?next=/bounties/${bountyId}`))}
        className="press flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-brand text-[15px] font-semibold text-white"
      >
        <Icon name="plus" size={18} strokeWidth={2.2} />
        상품을 찾았어요
      </button>
    );
  }
  const numPrice = Number(price.replace(/[^\d]/g, "")) || 0;
  const diff = targetPrice && numPrice ? numPrice - targetPrice : null;
  return (
    <div className="space-y-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold">찾은 상품 올리기</p>
        <button onClick={() => setOpen(false)} aria-label="닫기" className="text-muted">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (t) setTimeout(() => load(t), 0);
          }}
          placeholder="상품 링크를 붙여넣으세요"
          inputMode="url"
          className="h-11 min-w-0 flex-1 rounded-xl bg-fill px-3.5 text-[15px] outline-none placeholder:text-muted"
        />
        <button onClick={() => load()} disabled={busy || !url} className="press h-11 rounded-xl bg-ink px-4 text-[14px] font-semibold text-surface disabled:opacity-30">
          불러오기
        </button>
      </div>
      {p && (
        <>
          <div className="flex gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-fill">
              {p.meta.image && (
                <Img src={p.meta.image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="상품명" className="h-10 w-full rounded-lg bg-fill px-3 text-[14px] outline-none" />
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="가격(원)" inputMode="numeric" className="h-10 w-full rounded-lg bg-fill px-3 text-[14px] outline-none" />
            </div>
          </div>
          <p className="text-[13px] text-sub">
            {p.merchant.name}
            {diff != null && (
              <span className={diff <= 0 ? "text-positive" : "text-negative"}>
                {" "}
                · {diff <= 0 ? `목표가보다 ${Math.abs(diff).toLocaleString()}원 싸요` : `목표가보다 ${diff.toLocaleString()}원 비싸요`}
              </span>
            )}
          </p>
          <button onClick={submit} disabled={busy || title.length < 2} className="press h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-white disabled:bg-line disabled:text-muted">
            {busy ? "올리는 중" : "올리기"}
          </button>
        </>
      )}
      {error && <p className="text-[13px] text-negative">{error}</p>}
    </div>
  );
}
