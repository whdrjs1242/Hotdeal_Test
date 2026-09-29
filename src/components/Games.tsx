"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LuckyBox({ opened, loggedIn, odds }: { opened: boolean; loggedIn: boolean; odds: { points: number; pct: string }[] }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "shaking" | number>(opened ? -1 : "idle");
  async function open() {
    if (!loggedIn) return router.push("/login?next=/points");
    setState("shaking");
    const res = await fetch("/api/games/lucky", { method: "POST" });
    const d = await res.json();
    await new Promise((r) => setTimeout(r, 900));
    if (!res.ok) {
      alert(d.error);
      return setState(-1);
    }
    setState(d.points);
    router.refresh();
  }
  const done = typeof state === "number";
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#ffe7a3] to-[#ffb86b] p-4 text-[#3b2a1a]">
      <div className="flex items-center gap-3">
        <div className={`text-5xl ${state === "shaking" ? "animate-bounce" : ""}`}>{done && state > 0 ? "🎉" : "🎁"}</div>
        <div className="flex-1">
          <div className="font-black">무료 럭키박스</div>
          <div className="text-xs opacity-80">하루 한 번, 무료로 열어보세요</div>
        </div>
        <button
          onClick={open}
          disabled={done || state === "shaking"}
          className="rounded-xl bg-[#3b2a1a] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {state === "shaking" ? "두근두근…" : done ? (state > 0 ? `+${state}P!` : "내일 또!") : "열기"}
        </button>
      </div>
      <details className="mt-2 text-[11px] opacity-80">
        <summary className="cursor-pointer">확률 보기</summary>
        <div className="mt-1 flex flex-wrap gap-x-3">
          {odds.map((o) => (
            <span key={o.points}>
              {o.points}P {o.pct}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

interface GachaItem {
  name: string;
  image: string;
  rarity: string;
  slot: string;
}

const RARITY_LABEL: Record<string, string> = { common: "일반", rare: "레어", epic: "에픽", legendary: "전설" };
const RARITY_BG: Record<string, string> = {
  common: "linear-gradient(135deg,#e5e7eb,#9ca3af)",
  rare: "linear-gradient(135deg,#9ec5f4,#2a78d6)",
  epic: "linear-gradient(135deg,#b7a9ff,#4a3aa7)",
  legendary: "linear-gradient(135deg,#fff1b8,#eda100)",
};

export function Gacha({ cost, loggedIn, odds, balance }: { cost: number; loggedIn: boolean; odds: { label: string; pct: string }[]; balance: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<GachaItem | null>(null);
  async function draw() {
    if (!loggedIn) return router.push("/login?next=/points");
    setBusy(true);
    const res = await fetch("/api/games/gacha", { method: "POST" });
    const d = await res.json();
    await new Promise((r) => setTimeout(r, 700));
    setBusy(false);
    if (!res.ok) return alert(d.error);
    setWon(d.item);
    router.refresh();
  }
  const preview = (it: GachaItem) =>
    it.slot === "card" ? <span className="block h-14 w-20 rounded-lg" style={{ background: it.image }} /> : it.slot === "frame" ? <span className="block h-14 w-14 rounded-full" style={{ boxShadow: `0 0 0 4px ${it.image}` }} /> : <span className="text-6xl">{it.image}</span>;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#2b1f5c] to-[#4a3aa7] p-4 text-white">
      <div className="flex items-center gap-3">
        <div className={`text-5xl ${busy ? "animate-spin" : ""}`}>🎰</div>
        <div className="flex-1">
          <div className="font-black">꾸미기 뽑기</div>
          <div className="text-xs opacity-80">{cost}P로 아직 없는 캐릭터·카드·칭호 1개</div>
        </div>
        <button onClick={draw} disabled={busy || (loggedIn && balance < cost)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#2b1f5c] disabled:opacity-50">
          {busy ? "뽑는 중…" : `${cost}P 뽑기`}
        </button>
      </div>
      <details className="mt-2 text-[11px] opacity-80">
        <summary className="cursor-pointer">등급 확률 (확률형 아이템 정보 공개)</summary>
        <div className="mt-1 flex flex-wrap gap-x-3">
          {odds.map((o) => (
            <span key={o.label}>
              {o.label} {o.pct}
            </span>
          ))}
        </div>
        <p className="mt-1">보유하지 않은 아이템 중에서만 나오며, 해당 등급을 모두 모으면 남은 등급에서 뽑혀요. 포인트는 돌려주지 않아요.</p>
      </details>
      {won && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={() => setWon(null)}>
          <div className="w-full max-w-xs rounded-3xl p-6 text-center text-white shadow-2xl" style={{ background: RARITY_BG[won.rarity] }}>
            <div className="text-xs font-bold tracking-widest opacity-90">{RARITY_LABEL[won.rarity]} 획득!</div>
            <div className="my-5 flex justify-center">{preview(won)}</div>
            <div className="text-lg font-black">{won.name}</div>
            <a href="/me/closet" className="mt-4 block rounded-xl bg-white/90 py-2.5 text-sm font-bold text-ink">
              지금 장착하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
