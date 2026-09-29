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
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const short = balance < item.price;

  async function buy() {
    setBusy(true);
    const res = await fetch("/api/market/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: item.id, contact: item.kind === "cosmetic" ? null : contact }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg(d.error);
    setMsg(item.kind === "cosmetic" ? "획득 완료! 옷장에서 장착하세요" : "교환 신청 완료! 곧 보내드릴게요");
    router.refresh();
  }

  return (
    <>
      <button
        disabled={disabled}
        onClick={() => (loggedIn ? setOpen(true) : router.push("/login?next=/market"))}
        className="h-9 w-full rounded-xl bg-ink text-sm font-bold text-surface disabled:bg-canvas disabled:text-sub"
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div className="pb-safe mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black">{item.name}</h3>
            <p className="mt-1 text-sm text-sub">
              {item.price.toLocaleString()}P 사용 · 교환 후 {(balance - item.price).toLocaleString()}P
            </p>
            {item.kind !== "cosmetic" && !msg && (
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={item.kind === "giftcard" ? "받을 휴대폰 번호" : "받는 분 · 연락처 · 주소"}
                className="mt-4 h-11 w-full rounded-xl bg-canvas px-3 text-sm outline-none"
              />
            )}
            {msg ? (
              <p className="mt-4 rounded-xl bg-canvas p-3 text-sm font-semibold">{msg}</p>
            ) : (
              <button
                onClick={buy}
                disabled={busy || short}
                className="mt-4 h-12 w-full rounded-xl bg-brand font-bold text-white disabled:opacity-40"
              >
                {short ? "포인트가 부족해요" : busy ? "처리 중…" : "교환하기"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
