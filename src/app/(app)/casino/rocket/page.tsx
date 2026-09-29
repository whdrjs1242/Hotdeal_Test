import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { casinoState } from "@/lib/casino";
import { Rocket } from "@/components/casino/Rocket";
import { GameHeader } from "@/components/casino/GameHeader";

export const metadata = { title: "로켓 탈출" };

export default async function RocketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/casino/rocket");
  const [{ chips }, recent] = await Promise.all([
    casinoState(user.id),
    sql<{ crash: number }[]>`SELECT (detail->>'crash')::float AS crash FROM chip_ledger WHERE game = 'rocket' ORDER BY id DESC LIMIT 12`,
  ]);
  return (
    <div className="lounge pt-safe min-h-dvh">
      <GameHeader title="🚀 로켓 탈출" />
      <Rocket initialChips={chips} recent={recent.map((r) => r.crash)} />
    </div>
  );
}
