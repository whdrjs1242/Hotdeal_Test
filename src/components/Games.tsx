"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** 무료 럭키박스: 오늘 할 일 목록의 한 줄 */
export function LuckyBoxButton({ opened, loggedIn }: { opened: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | number>(opened ? 0 : "idle");
  async function open() {
    if (!loggedIn) return router.push("/login?next=/points");
    setState("busy");
    const res = await fetch("/api/games/lucky", { method: "POST" });
    const d = await res.json();
    if (!res.ok) return setState(0);
    setState(d.points);
    router.refresh();
  }
  if (typeof state === "number") {
    return <span className="text-[13px] font-semibold text-positive">{state > 0 ? `+${state}P 받음` : "완료"}</span>;
  }
  return (
    <button onClick={open} disabled={state === "busy"} className="press h-8 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white">
      {state === "busy" ? "여는 중" : "열기"}
    </button>
  );
}

interface GachaItem {
  name: string;
  image: string;
  rarity: string;
  slot: string;
}
const RARITY_LABEL: Record<string, string> = { common: "일반", rare: "희귀", epic: "영웅", legendary: "전설" };
const SLOT_LABEL: Record<string, string> = { character: "캐릭터", card: "프로필 카드", frame: "테두리", title: "칭호" };

/** 포인트 꾸미기 뽑기 */
export function GachaButton({ cost, loggedIn, balance }: { cost: number; loggedIn: boolean; balance: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<GachaItem | null>(null);
  async function draw() {
    if (!loggedIn) return router.push("/login?next=/points");
    setBusy(true);
    const res = await fetch("/api/games/gacha", { method: "POST" });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return alert(d.error);
    setWon(d.item);
    router.refresh();
  }
  return (
    <>
      <button onClick={draw} disabled={busy || (loggedIn && balance < cost)} className="press h-8 rounded-lg bg-fill px-3 text-[13px] font-semibold disabled:text-muted">
        {busy ? "뽑는 중" : `${cost}P`}
      </button>
      {won && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setWon(null)}>
          <div className="sheet-up pb-safe mx-auto w-full max-w-md rounded-t-2xl bg-surface p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-[13px] text-muted">
              {RARITY_LABEL[won.rarity]} · {SLOT_LABEL[won.slot]}
            </p>
            <div className="my-5 flex h-20 items-center justify-center text-6xl">
              {won.slot === "card" ? (
                <span className="block h-16 w-28 rounded-lg" style={{ background: won.image }} />
              ) : won.slot === "frame" ? (
                <span className="block h-16 w-16 rounded-full" style={{ boxShadow: `0 0 0 4px ${won.image}` }} />
              ) : won.slot === "title" ? (
                <span className="rounded-full bg-fill px-3 py-1.5 text-[15px] font-semibold">{won.name}</span>
              ) : (
                won.image
              )}
            </div>
            <p className="text-[18px] font-bold">{won.name}을(를) 얻었어요</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => setWon(null)} className="press h-11 rounded-xl bg-fill text-[15px] font-semibold">
                닫기
              </button>
              <a href="/me/closet" className="press flex h-11 items-center justify-center rounded-xl bg-brand text-[15px] font-semibold text-white">
                바로 적용하기
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
