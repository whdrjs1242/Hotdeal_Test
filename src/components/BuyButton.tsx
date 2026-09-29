"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyButton({
  item,
  disabled,
  label,
  loggedIn,
  balance,
}: {
  item: { id: number; name: string; kind: string; price: number };
  disabled: boolean;
  label: string;
  loggedIn: boolean;
  balance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const short = balance < item.price;

  async function buy() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/market/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: item.id, contact: item.kind === "cosmetic" ? null : contact }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(d.error);
    setDone(item.kind === "cosmetic" ? "교환했어요. 프로필 꾸미기에서 적용할 수 있어요." : "교환 신청이 접수됐어요. 발송되면 알림으로 알려드릴게요.");
    router.refresh();
  }

  return (
    <>
      <button
        disabled={disabled}
        onClick={() => (loggedIn ? setOpen(true) : router.push("/login?next=/market"))}
        className="press h-9 shrink-0 rounded-lg bg-fill px-3.5 text-[14px] font-semibold disabled:text-muted"
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div className="sheet-up pb-safe mx-auto w-full max-w-md rounded-t-2xl bg-surface px-5 pb-6 pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="text-[18px] font-bold">{item.name}</h3>
            <dl className="mt-3 space-y-1.5 rounded-xl bg-fill px-4 py-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-sub">사용할 포인트</dt>
                <dd className="tnum font-semibold">{item.price.toLocaleString()}P</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sub">교환 후 남는 포인트</dt>
                <dd className={`tnum font-semibold ${short ? "text-negative" : ""}`}>{(balance - item.price).toLocaleString()}P</dd>
              </div>
            </dl>
            {item.kind !== "cosmetic" && !done && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[14px] font-semibold">{item.kind === "giftcard" ? "받을 휴대폰 번호" : "받는 분 · 연락처 · 주소"}</span>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  inputMode={item.kind === "giftcard" ? "tel" : "text"}
                  placeholder={item.kind === "giftcard" ? "010-0000-0000" : "홍길동 010-0000-0000 서울시 ..."}
                  className="h-12 w-full rounded-xl bg-fill px-4 text-[15px] outline-none placeholder:text-muted"
                />
              </label>
            )}
            {done ? (
              <>
                <p className="mt-4 text-[15px]">{done}</p>
                <button onClick={() => setOpen(false)} className="press mt-4 h-12 w-full rounded-xl bg-fill text-[15px] font-semibold">
                  확인
                </button>
              </>
            ) : (
              <button onClick={buy} disabled={busy || short} className="press mt-4 h-[52px] w-full rounded-xl bg-brand text-[16px] font-semibold text-white disabled:bg-line disabled:text-muted">
                {short ? "포인트가 부족해요" : busy ? "처리 중" : "교환하기"}
              </button>
            )}
            {err && <p className="mt-2 text-[13px] text-negative">{err}</p>}
          </div>
        </div>
      )}
    </>
  );
}
