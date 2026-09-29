"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { Img } from "@/components/Img";

interface Preview {
  canonicalUrl: string;
  merchant: { id: string; name: string };
  monetized: boolean;
  meta: { title?: string; image?: string; price?: number; originalPrice?: number; category: string };
  duplicate: { id: number; title: string; price: number | null } | null;
}

const field = "h-12 w-full rounded-xl bg-fill px-4 text-[15px] outline-none placeholder:text-muted focus:ring-2 focus:ring-ink/10";
const label = "mb-1.5 block text-[14px] font-semibold";

/** 1단계: 링크 → 2단계: 자동 채워진 정보 확인·수정 → 올리기 */
export function SubmitForm({ initialUrl }: { initialUrl: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState({ title: "", price: "", originalPrice: "", shipping: "무료배송", imageUrl: "", category: "etc", description: "", endsAt: "" });
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
    const num = (v: string) => (v ? Number(v.replace(/[^\d]/g, "")) : null);
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: preview?.canonicalUrl ?? url,
        title: form.title,
        description: form.description || null,
        price: num(form.price),
        originalPrice: num(form.originalPrice),
        shipping: form.shipping || null,
        imageUrl: form.imageUrl || null,
        category: form.category,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "올리지 못했어요");
    router.replace(`/deals/${data.id}`);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const price = Number(form.price.replace(/[^\d]/g, "")) || 0;
  const orig = Number(form.originalPrice.replace(/[^\d]/g, "")) || 0;
  const off = orig > price && price > 0 ? Math.round((1 - price / orig) * 100) : 0;

  return (
    <form onSubmit={submit} className="space-y-2 pb-10">
      <section className="bg-surface px-5 py-5">
        <label className={label} htmlFor="deal-url">
          상품 링크
        </label>
        <div className="flex gap-2">
          <input
            id="deal-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text");
              if (t) setTimeout(() => load(t), 0);
            }}
            placeholder="쇼핑몰 상품 링크를 붙여넣으세요"
            className={field}
            inputMode="url"
          />
          <button type="button" onClick={() => load()} disabled={busy || !url} className="press h-12 shrink-0 rounded-xl bg-ink px-4 text-[15px] font-semibold text-surface disabled:opacity-30">
            {busy && !preview ? "확인 중" : "불러오기"}
          </button>
        </div>
        {!preview && <p className="mt-2 text-[13px] text-muted">쿠팡, 11번가, G마켓, 알리익스프레스 등 대부분의 쇼핑몰 링크를 쓸 수 있어요.</p>}
        {preview?.duplicate && (
          <a href={`/deals/${preview.duplicate.id}`} className="mt-3 block rounded-xl bg-[#fff7e6] px-4 py-3 text-[14px] text-[#8a5a00] dark:bg-[#2e2615] dark:text-[#f0c26b]">
            같은 상품이 이미 올라와 있어요: {preview.duplicate.title}
          </a>
        )}
      </section>

      {(preview || form.title) && (
        <>
          <section className="space-y-4 bg-surface px-5 py-5">
            <div className="flex gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-fill">
                {form.imageUrl && (
                  <Img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="text-[13px] text-muted">
                <p className="text-[14px] font-semibold text-ink">{preview?.merchant.name}</p>
                <p className="mt-0.5">상품 정보는 판매처 페이지에서 자동으로 가져왔어요. 다르면 고쳐주세요.</p>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="t">
                제목
              </label>
              <input id="t" required value={form.title} onChange={set("title")} maxLength={120} className={field} placeholder="상품명과 조건을 알기 쉽게" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label} htmlFor="p">
                  판매가
                </label>
                <input id="p" value={form.price} onChange={set("price")} inputMode="numeric" className={field} placeholder="원" />
              </div>
              <div>
                <label className={label} htmlFor="o">
                  정가 <span className="font-normal text-muted">(선택)</span>
                </label>
                <input id="o" value={form.originalPrice} onChange={set("originalPrice")} inputMode="numeric" className={field} placeholder="원" />
              </div>
            </div>
            {off > 0 && <p className="-mt-2 text-[13px] text-brand">할인율 {off}%로 표시돼요</p>}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label} htmlFor="s">
                  배송
                </label>
                <input id="s" value={form.shipping} onChange={set("shipping")} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="c">
                  카테고리
                </label>
                <select id="c" value={form.category} onChange={set("category")} className={field}>
                  {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-4 bg-surface px-5 py-5">
            <div>
              <label className={label} htmlFor="e">
                마감 시간 <span className="font-normal text-muted">(타임딜이라면)</span>
              </label>
              <input id="e" type="datetime-local" value={form.endsAt} onChange={set("endsAt")} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="d">
                구매 팁 <span className="font-normal text-muted">(선택)</span>
              </label>
              <textarea
                id="d"
                value={form.description}
                onChange={set("description")}
                rows={3}
                maxLength={2000}
                className={`${field} h-auto py-3`}
                placeholder="카드 할인, 쿠폰 적용 방법 등"
              />
            </div>
          </section>

          <div className="px-5 pt-2">
            <button disabled={busy} className="press h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white disabled:bg-line disabled:text-muted">
              {busy ? "올리는 중" : "올리기"}
            </button>
          </div>
        </>
      )}
      {error && <p className="px-5 text-[14px] text-negative">{error}</p>}
    </form>
  );
}
