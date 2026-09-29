"use client";
import { useRouter } from "next/navigation";

export function EquipButton({
  slot,
  itemKey,
  equipped,
  name,
  rarity,
  children,
}: {
  slot: string;
  itemKey: string;
  equipped: boolean;
  name: string;
  rarity?: string;
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
      aria-pressed={equipped}
      className={`press flex flex-col items-center gap-1 rounded-xl p-2 ring-1 ring-inset ${equipped ? "bg-brand-soft ring-2 ring-brand" : "bg-fill ring-transparent"}`}
    >
      <span className="flex h-10 items-center justify-center">{children}</span>
      <span className="line-clamp-1 text-[12px] font-semibold">{name}</span>
      <span className={`text-[11px] ${equipped ? "font-semibold text-brand" : "text-muted"}`}>{equipped ? "적용 중" : rarity}</span>
    </button>
  );
}
