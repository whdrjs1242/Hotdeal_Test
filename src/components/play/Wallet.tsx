"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Marbles, n, post, useToast } from "./common";

export function MarbleWallet({
  marbles,
  canClaim,
  claimKind,
  points,
  convert,
}: {
  marbles: number;
  canClaim: boolean;
  claimKind: "daily" | "refill";
  points: number;
  convert: { pointsPerUnit: number; marblesPerUnit: number; maxPointsPerDay: number };
}) {
  const router = useRouter();
  const [m, setM] = useState(marbles);
  const [claimable, setClaimable] = useState(canClaim);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  async function claim() {
    try {
      const d = await post<{ amount: number; kind: string }>("/api/play/claim");
      setM((x) => x + d.amount);
      setClaimable(false);
      toast.show(`구슬 ${n(d.amount)}개를 받았어요`);
      router.refresh();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  async function exchange(p: number) {
    try {
      const d = await post<{ marbles: number }>("/api/play/convert", { points: p });
      setM((x) => x + d.marbles);
      setOpen(false);
      toast.show(`${n(p)}P를 구슬 ${n(d.marbles)}개로 바꿨어요`);
      router.refresh();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  return (
    <div className="rounded-2xl bg-fill p-4">
      {toast.node}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-sub">내 구슬</p>
          <Marbles value={m} className="text-[22px] font-bold" />
        </div>
        {claimable ? (
          <button onClick={claim} className="press h-10 rounded-xl bg-brand px-4 text-[14px] font-semibold text-white">
            {claimKind === "daily" ? `오늘 구슬 받기` : "다시 채우기"}
          </button>
        ) : (
          <button onClick={() => setOpen((v) => !v)} className="press h-10 rounded-xl bg-surface px-4 text-[14px] font-semibold ring-1 ring-line">
            포인트로 바꾸기
          </button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[100, 500, 1000].filter((p) => p <= convert.maxPointsPerDay).map((p) => (
            <button
              key={p}
              onClick={() => exchange(p)}
              disabled={points < p}
              className="press rounded-xl bg-surface py-2 text-[13px] ring-1 ring-line disabled:opacity-40"
            >
              <span className="block font-semibold">{n(p)}P</span>
              <span className="text-muted">구슬 {n((p / convert.pointsPerUnit) * convert.marblesPerUnit)}개</span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        구슬은 놀이터에서만 쓰는 재화예요. 포인트·현금으로 바꿀 수 없어요. 매일 {n(1000)}개를 받을 수 있고, 포인트는 하루 {n(convert.maxPointsPerDay)}P까지 구슬로 바꿀 수 있어요.
      </p>
    </div>
  );
}

export function MarbleShopItem({ id, name, image, slot, price, owned }: { id: number; name: string; image: string; slot: string; price: number; owned: boolean }) {
  const router = useRouter();
  const [have, setHave] = useState(owned);
  const toast = useToast();
  async function buy() {
    if (!confirm(`구슬 ${n(price)}개로 '${name}'을(를) 살까요?`)) return;
    try {
      await post("/api/play/buy", { itemId: id });
      setHave(true);
      toast.show("구매했어요. 내 정보 > 꾸미기에서 적용할 수 있어요");
      router.refresh();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  return (
    <div className="flex w-28 shrink-0 flex-col items-center rounded-2xl bg-surface p-3 text-center ring-1 ring-line">
      {toast.node}
      <div className="flex h-12 items-center justify-center text-3xl">
        {slot === "card" ? (
          <span className="block h-9 w-14 rounded-md" style={{ background: image }} />
        ) : slot === "frame" ? (
          <span className="block h-9 w-9 rounded-full" style={{ boxShadow: `0 0 0 3px ${image}` }} />
        ) : slot === "title" ? (
          <span className="text-[12px] font-semibold text-sub">칭호</span>
        ) : (
          image
        )}
      </div>
      <p className="mt-1 line-clamp-1 text-[13px] font-semibold">{name}</p>
      <button onClick={buy} disabled={have} className="press mt-2 h-8 w-full rounded-lg bg-fill text-[12px] font-semibold disabled:text-muted">
        {have ? "보유 중" : `구슬 ${price >= 10000 ? `${price / 10000}만` : n(price)}`}
      </button>
    </div>
  );
}
