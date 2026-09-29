import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { casinoState, SLOT_PAYTABLE } from "@/lib/casino";
import { Slot } from "@/components/casino/Slot";
import { GameHeader } from "@/components/casino/GameHeader";

export const metadata = { title: "줍줍 슬롯" };

export default async function SlotPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/casino/slot");
  const { chips } = await casinoState(user.id);
  const paytable = Object.entries(SLOT_PAYTABLE)
    .map(([s, x]) => ({ s, x }))
    .reverse();
  return (
    <div className="lounge pt-safe min-h-dvh">
      <GameHeader title="🎰 줍줍 슬롯" />
      <Slot initialChips={chips} paytable={paytable} />
    </div>
  );
}
