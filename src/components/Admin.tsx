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

export function WithdrawalActions({ id }: { id: number }) {
  const [state, setState] = useState<"idle" | "paid" | "rejected">("idle");
  const [account, setAccount] = useState<string | null>(null);
  async function reveal() {
    const res = await fetch(`/api/admin/withdrawals/${id}`);
    const d = await res.json();
    setAccount(res.ok ? `${d.bank} ${d.account} (${d.holder})` : d.error);
  }
  async function act(status: "paid" | "rejected") {
    const memo = status === "rejected" ? prompt("반려 사유") ?? "" : undefined;
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, memo }),
    });
    if (res.ok) setState(status);
  }
  if (state !== "idle") return <span className="text-xs font-semibold">{state === "paid" ? "✓ 송금 완료" : "반려됨"}</span>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
      {account ? <span className="tnum select-all">{account}</span> : <button onClick={reveal} className="rounded-md px-2 py-1 ring-1 ring-[var(--d-ring)]">계좌 보기</button>}
      <button onClick={() => act("paid")} className="rounded-md bg-[var(--d-ink)] px-2 py-1 font-semibold text-[var(--d-surface)]">
        송금 완료
      </button>
      <button onClick={() => act("rejected")} className="rounded-md px-2 py-1 ring-1 ring-[var(--d-ring)]">
        반려
      </button>
    </div>
  );
}
