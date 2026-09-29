"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";

interface Preview {
  canonicalUrl: string;
  merchant: { id: string; name: string };
  monetized: boolean;
  meta: { title?: string; image?: string; price?: number; originalPrice?: number; category: string };
  duplicate: { id: number; title: string; price: number | null } | null;
}

const input = "h-11 w-full rounded-xl bg-surface px-3 text-[15px] outline-none ring-1 ring-line focus:ring-2 focus:ring-brand";

export function SubmitForm({ initialUrl }: { initialUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState({
    title: "",
    price: "",
    originalPrice: "",
    shipping: "무료배송",
    imageUrl: "",
    category: "etc",
    description: "",
    endsAt: "",
  });
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
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "링크를 불러오지 못했어요");
    setPreview(data);
    setForm((f) => ({
      ...f,
      title: data.meta.title ?? f.title,
      price: data.meta.price ? String(data.meta.price) : f.price,
      originalPrice: data.meta.originalPrice ? String(data.meta.originalPrice) : f.originalPrice,
      imageUrl: data.meta.image ?? f.imageUrl,
      category: data.meta.category ?? f.category,
    }));
  }

  useEffect(() => {
    if (initialUrl) load(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: preview?.canonicalUrl ?? url,
        title: form.title,
        description: form.description || null,
        price: form.price ? Number(form.price.replace(/[^\d]/g, "")) : null,
        originalPrice: form.originalPrice ? Number(form.originalPrice.replace(/[^\d]/g, "")) : null,
        shipping: form.shipping || null,
        imageUrl: form.imageUrl || null,
        category: form.category,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "등록에 실패했어요");
    router.replace(`/deals/${data.id}`);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 pb-10">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (t) setTimeout(() => load(t), 0);
          }}
          placeholder="쇼핑몰 상품 링크 붙여넣기"
          className={input}
          inputMode="url"
        />
        <button type="button" onClick={() => load()} disabled={busy} className="h-11 shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-surface">
          {busy && !preview ? "…" : "불러오기"}
        </button>
      </div>

      {preview && (
        <div className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm">
          <b>{preview.merchant.name}</b>
          {preview.monetized ? (
            <span className="text-brand">✓ 구매 기여 포인트 적립 딜</span>
          ) : (
            <span className="text-sub">일반 링크</span>
          )}
        </div>
      )}
      {preview?.duplicate && (
        <a href={`/deals/${preview.duplicate.id}`} className="block rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          ⚠️ 이미 올라온 딜이 있어요: {preview.duplicate.title} → 보러가기
        </a>
      )}

      {(preview || form.title) && (
        <>
          {form.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="" className="mx-auto h-40 w-40 rounded-xl object-cover" />
          )}
          <label className="block text-sm font-semibold">
            제목
            <input required value={form.title} onChange={set("title")} maxLength={120} className={`${input} mt-1`} placeholder="예) [역대최저] 에어팟 프로2 199,000원" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-semibold">
              할인가
              <input value={form.price} onChange={set("price")} inputMode="numeric" className={`${input} mt-1`} placeholder="원" />
            </label>
            <label className="block text-sm font-semibold">
              정가 <span className="font-normal text-sub">(선택)</span>
              <input value={form.originalPrice} onChange={set("originalPrice")} inputMode="numeric" className={`${input} mt-1`} placeholder="원" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-semibold">
              배송
              <input value={form.shipping} onChange={set("shipping")} className={`${input} mt-1`} />
            </label>
            <label className="block text-sm font-semibold">
              카테고리
              <select value={form.category} onChange={set("category")} className={`${input} mt-1`}>
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">
            마감 시간 <span className="font-normal text-sub">(타임딜이면 입력 — 마감임박 탭에 노출)</span>
            <input type="datetime-local" value={form.endsAt} onChange={set("endsAt")} className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-semibold">
            꿀팁 <span className="font-normal text-sub">(카드할인, 쿠폰 적용법 등)</span>
            <textarea value={form.description} onChange={set("description")} rows={3} maxLength={2000} className={`${input} mt-1 h-auto py-2`} />
          </label>
          <button disabled={busy} className="h-12 w-full rounded-xl bg-brand text-[16px] font-bold text-white disabled:opacity-50">
            {busy ? "등록 중…" : "🔥 핫딜 올리기 (+10 XP)"}
          </button>
        </>
      )}
      {error && <p className="text-sm font-semibold text-brand">{error}</p>}
    </form>
  );
}
