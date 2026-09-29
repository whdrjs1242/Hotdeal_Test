"use client";
import { useState } from "react";

export function AdminConversionUpload() {
  const [text, setText] = useState("network,external_id,sub_id,order_amount,commission,status\n");
  const [result, setResult] = useState("");
  async function upload() {
    const res = await fetch("/api/admin/conversions", { method: "POST", body: text });
    const d = await res.json();
    setResult(res.ok ? `반영 ${d.ok}건${d.errors.length ? ` / 오류: ${d.errors.join(", ")}` : ""}` : d.error);
  }
  return (
    <div className="mt-2 space-y-2">
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setText(await f.text());
        }}
        className="text-xs"
      />
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full rounded-xl bg-canvas p-2 font-mono text-xs" />
      <button onClick={upload} className="h-10 w-full rounded-xl bg-ink text-sm font-bold text-surface">
        업로드
      </button>
      {result && <p className="text-xs">{result}</p>}
    </div>
  );
}

export function AdminDealStatus({ id, status }: { id: number; status: string }) {
  const [s, setS] = useState(status);
  async function change(next: string) {
    setS(next);
    await fetch(`/api/admin/deals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }
  return (
    <select value={s} onChange={(e) => change(e.target.value)} className="rounded-lg bg-canvas px-2 py-1 text-xs">
      {["active", "soldout", "expired", "hidden"].map((v) => (
        <option key={v}>{v}</option>
      ))}
    </select>
  );
}

export function OrderActions({ id }: { id: number }) {
  const [state, setState] = useState<"idle" | "fulfilled" | "canceled">("idle");
  const [contact, setContact] = useState<string | null>(null);
  const [code, setCode] = useState("");
  async function reveal() {
    const res = await fetch(`/api/admin/orders/${id}`);
    const d = await res.json();
    setContact(res.ok ? d.contact ?? "-" : d.error);
  }
  async function act(action: "fulfill" | "cancel") {
    const memo = action === "cancel" ? prompt("취소 사유 (포인트는 환불돼요)") ?? "" : undefined;
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, delivery: code || undefined, memo }),
    });
    if (res.ok) setState(action === "fulfill" ? "fulfilled" : "canceled");
  }
  if (state !== "idle") return <span className="text-xs font-semibold">{state === "fulfilled" ? "✓ 발송 완료" : "취소·환불됨"}</span>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
      {contact ? <span className="select-all">{contact}</span> : <button onClick={reveal} className="rounded-md px-2 py-1 ring-1 ring-[var(--d-ring)]">연락처 보기</button>}
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="쿠폰/송장 번호" className="h-7 w-32 rounded-md bg-transparent px-2 ring-1 ring-[var(--d-ring)]" />
      <button onClick={() => act("fulfill")} className="rounded-md bg-[var(--d-ink)] px-2 py-1 font-semibold text-[var(--d-surface)]">
        발송 완료
      </button>
      <button onClick={() => act("cancel")} className="rounded-md px-2 py-1 ring-1 ring-[var(--d-ring)]">
        취소
      </button>
    </div>
  );
}

export function ItemToggle({ id, active }: { id: number; active: boolean }) {
  const [on, setOn] = useState(active);
  async function toggle() {
    const res = await fetch("/api/admin/items", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, active: !on }),
    });
    if (res.ok) setOn(!on);
  }
  return (
    <button onClick={toggle} className="rounded-md px-2 py-0.5 text-xs ring-1 ring-[var(--d-ring)]">
      {on ? "판매 중" : "중지됨"}
    </button>
  );
}

export function AddItemForm() {
  const [f, setF] = useState({ kind: "giftcard", name: "", image: "", pricePoints: "", stock: "", maxPerUserMonth: "3" });
  const [msg, setMsg] = useState("");
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...f,
        pricePoints: Number(f.pricePoints),
        stock: f.stock ? Number(f.stock) : null,
        maxPerUserMonth: f.maxPerUserMonth ? Number(f.maxPerUserMonth) : null,
      }),
    });
    const d = await res.json();
    setMsg(res.ok ? "추가됐어요 (새로고침하면 목록에 보여요)" : d.error ?? "실패");
  }
  const cls = "h-8 rounded-md bg-transparent px-2 text-xs ring-1 ring-[var(--d-ring)]";
  return (
    <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-1.5">
      <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={cls}>
        <option value="giftcard">상품권</option>
        <option value="product">제휴 상품</option>
      </select>
      <input value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} placeholder="이모지/이미지 URL" className={cls} />
      <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="상품명" className={`${cls} col-span-2`} />
      <input required value={f.pricePoints} onChange={(e) => setF({ ...f, pricePoints: e.target.value })} placeholder="가격(P)" inputMode="numeric" className={cls} />
      <input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} placeholder="재고(빈칸=무제한)" inputMode="numeric" className={cls} />
      <input value={f.maxPerUserMonth} onChange={(e) => setF({ ...f, maxPerUserMonth: e.target.value })} placeholder="1인 월 한도" inputMode="numeric" className={cls} />
      <button className="h-8 rounded-md bg-[var(--d-ink)] text-xs font-semibold text-[var(--d-surface)]">상품 추가</button>
      {msg && <p className="col-span-2 text-xs">{msg}</p>}
    </form>
  );
}
