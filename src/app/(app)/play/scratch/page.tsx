import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { playState, SCRATCH } from "@/lib/play";
import { TopBar } from "@/components/ui";
import { Scratch } from "@/components/play/Scratch";

export const metadata = { title: "긁는 쿠폰" };

export default async function ScratchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/play/scratch");
  const { marbles } = await playState(user.id);
  return (
    <>
      <TopBar title="긁는 쿠폰" />
      <Scratch initialMarbles={marbles} cost={SCRATCH.cost} table={SCRATCH.table.map((t) => ({ ...t }))} />
    </>
  );
}
