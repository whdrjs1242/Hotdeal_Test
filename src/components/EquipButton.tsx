"use client";
import { useRouter } from "next/navigation";

export function EquipButton({
  slot,
  itemKey,
  equipped,
  name,
  color,
  children,
}: {
  slot: string;
  itemKey: string;
  equipped: boolean;
  name: string;
  color?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  async function toggle() {
    await fetch("/api/me/equip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slot, itemKey: equipped ? null : itemKey }),
    });
    router.refresh();
  }
  return (
    <button
      onClick={toggle}
      className={`flex flex-col items-center gap-1 rounded-xl bg-surface p-2 ring-1 ${equipped ? "ring-2 ring-brand" : "ring-line"}`}
    >
      <span className="flex h-10 items-center justify-center">{children}</span>
      <span className="line-clamp-1 text-[10px]" style={{ color }}>
        {name}
      </span>
      {equipped && <span className="text-[10px] font-bold text-brand">장착 중</span>}
    </button>
  );
}
