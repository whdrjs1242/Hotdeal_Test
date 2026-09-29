"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CashoutForm({ balance, min, rate }: { balance: number; min: number; rate: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ points: String(Math.max(min, balance)), bankName: "", account: "", holderName: "" });
  const [msg, setMsg] = useState("");
  const enough = balance >= min;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/me/withdraw", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, points: Number(f.points.replace(/[^\d]/g, "")) }),
    });
    const d = await res.json();
    if (!res.ok) return setMsg(d.error ?? d.issues?.[0]?.message ?? "신청에 실패했어요");
    setMsg(`${d.amount.toLocaleString()}원 현금화 신청 완료! 영업일 기준 3일 안에 입금돼요`);
    setOpen(false);
    router.refresh();
  }

  const cls = "h-10 w-full rounded-lg bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/40";
  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          disabled={!enough}
          className="h-11 w-full rounded-xl bg-white text-sm font-bold text-ink disabled:opacity-40"
        >
          {enough ? "💸 현금으로 바꾸기" : `${min.toLocaleString()}P부터 현금화할 수 있어요`}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input value={f.points} onChange={(e) => setF({ ...f, points: e.target.value })} inputMode="numeric" className={cls} placeholder="포인트" />
          <div className="grid grid-cols-2 gap-2">
            <input value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} className={cls} placeholder="은행" />
            <input value={f.holderName} onChange={(e) => setF({ ...f, holderName: e.target.value })} className={cls} placeholder="예금주" />
          </div>
          <input value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })} inputMode="numeric" className={cls} placeholder="계좌번호" />
          <p className="text-[11px] opacity-70">
            {Number(f.points.replace(/[^\d]/g, "") || 0).toLocaleString()}P → {Math.floor(Number(f.points.replace(/[^\d]/g, "") || 0) * rate).toLocaleString()}원 ·
            관련 법령에 따라 세금이 원천징수될 수 있어요
          </p>
          <button className="h-11 w-full rounded-xl bg-white text-sm font-bold text-ink">현금화 신청</button>
        </form>
      )}
      {msg && <p className="mt-2 text-xs">{msg}</p>}
    </div>
  );
}
