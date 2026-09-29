import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CAPSULE, playState } from "@/lib/play";
import { TopBar } from "@/components/ui";
import { Capsule } from "@/components/play/Capsule";

export const metadata = { title: "뽑기 캡슐" };

export default async function CapsulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/play/capsule");
  const { marbles } = await playState(user.id);
  return (
    <>
      <TopBar title="뽑기 캡슐" />
      <Capsule initialMarbles={marbles} cost={CAPSULE.cost} table={CAPSULE.table.map((t) => ({ ...t }))} />
    </>
  );
}
