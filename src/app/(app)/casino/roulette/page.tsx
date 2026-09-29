import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { casinoState } from "@/lib/casino";
import { Roulette } from "@/components/casino/Roulette";
import { GameHeader } from "@/components/casino/GameHeader";

export const metadata = { title: "러키 룰렛" };

export default async function RoulettePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/casino/roulette");
  const { chips } = await casinoState(user.id);
  return (
    <div className="lounge pt-safe min-h-dvh">
      <GameHeader title="🎡 러키 룰렛" />
      <Roulette initialChips={chips} />
    </div>
  );
}
