"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChipCount, fmt, post, useToast } from "./common";

export function ChipWallet({
  chips,
  canClaim,
  claimKind,
  points,
  convert,
}: {
  chips: number;
  canClaim: boolean;
  claimKind: string;
  points: number;
  convert: { pointsPerUnit: number; chipsPerUnit: number; maxPointsPerDay: number };
}) {
  const router = useRouter();
  const [c, setC] = useState(chips);
  const [claimable, setClaimable] = useState(canClaim);
  const [pts, setPts] = useState(convert.pointsPerUnit);
  const toast = useToast();

  async function claim() {
    try {
      const d = await post<{ amount: number; kind: string }>("/api/casino/claim");
      setC((x) => x + d.amount);
      setClaimable(false);
      toast.show(d.kind === "daily" ? `🎁 오늘의 무료 칩 +${fmt(d.amount)}` : `🆘 긴급 리필 +${fmt(d.amount)}`);
      router.refresh();
    } catch (e) {
      toast.show((e as Error).message || "지금은 받을 수 없어요");
    }
  }
  async function exchange() {
    try {
      const d = await post<{ chips: number }>("/api/casino/convert", { points: pts });
      setC((x) => x + d.chips);
      toast.show(`🪙 ${fmt(d.chips)}칩 충전 완료!`);
      router.refresh();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  return (
    <div className="rounded-[28px] bg-white/10 p-4 backdrop-blur">
      {toast.node}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/70">내 줍칩</div>
          <ChipCount value={c} className="font-display text-4xl text-[#ffd666]" />
        </div>
        <button
          onClick={claim}
          disabled={!claimable}
          className="btn-pop rounded-2xl bg-gradient-to-b from-[#ffd666] to-[#ffae00] px-4 py-3 text-sm font-black text-[#3b2a1a] disabled:from-white/20 disabled:to-white/10 disabled:text-white/50"
        >
          {claimable ? (claimKind === "daily" ? "🎁 무료 칩 받기" : "🆘 긴급 리필") : "내일 또 받기"}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-black/20 p-2 text-xs">
        <span className="shrink-0 pl-1 text-white/70">포인트로 충전</span>
        <select value={pts} onChange={(e) => setPts(Number(e.target.value))} className="h-8 min-w-0 flex-1 rounded-lg bg-white/10 px-2 text-white">
          {[1, 3, 5, 10].map((k) => {
            const p = k * convert.pointsPerUnit;
            return p <= convert.maxPointsPerDay ? (
              <option key={k} value={p} className="text-black">
                {fmt(p)}P → 🪙{fmt(k * convert.chipsPerUnit)}
              </option>
            ) : null;
          })}
        </select>
        <button onClick={exchange} disabled={points < pts} className="btn-pop h-8 shrink-0 rounded-lg bg-[#ff4fa3] px-3 font-bold disabled:opacity-40">
          충전
        </button>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-white/50">
        줍칩은 라운지 전용 놀이 칩이에요. 현금·포인트·상품권으로 바꿀 수 없고, 칩으로는 라운지 전용 꾸미기만 살 수 있어요. 포인트 충전은 하루{" "}
        {fmt(convert.maxPointsPerDay)}P까지.
      </p>
    </div>
  );
}

export function ChipShopItem({ id, name, image, slot, rarity, price, owned }: { id: number; name: string; image: string; slot: string; rarity: string; price: number; owned: boolean }) {
  const router = useRouter();
  const [have, setHave] = useState(owned);
  const toast = useToast();
  async function buy() {
    if (!confirm(`🪙${fmt(price)}칩으로 '${name}'을(를) 살까요?`)) return;
    try {
      await post("/api/casino/buy", { itemId: id });
      setHave(true);
      toast.show("획득! MY > 꾸미기에서 장착하세요");
      router.refresh();
    } catch (e) {
      toast.show((e as Error).message);
    }
  }
  const color = { common: "#c9c3d3", rare: "#6aa8ff", epic: "#b18cff", legendary: "#ffd666" }[rarity] ?? "#fff";
  return (
    <div className="flex w-32 shrink-0 flex-col items-center rounded-3xl bg-white/10 p-3 text-center">
      {toast.node}
      <div className="flex h-14 items-center justify-center text-4xl">
        {slot === "card" ? (
          <span className="block h-10 w-16 rounded-lg" style={{ background: image }} />
        ) : slot === "frame" ? (
          <span className="block h-10 w-10 rounded-full" style={{ boxShadow: `0 0 0 3px ${image}, 0 0 14px ${image}` }} />
        ) : (
          image
        )}
      </div>
      <div className="mt-1 line-clamp-1 text-xs font-bold" style={{ color }}>
        {name}
      </div>
      <button onClick={buy} disabled={have} className="btn-pop mt-2 w-full rounded-xl bg-[#ffd666] py-1.5 text-[11px] font-black text-[#3b2a1a] disabled:bg-white/15 disabled:text-white/60">
        {have ? "보유 중" : `🪙${price >= 10000 ? `${price / 10000}만` : fmt(price)}`}
      </button>
    </div>
  );
}
