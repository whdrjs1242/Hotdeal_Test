import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { playState, updownState } from "@/lib/play";
import { TopBar } from "@/components/ui";
import { UpDown } from "@/components/play/UpDown";

export const metadata = { title: "가격 업다운" };

export default async function UpDownPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/play/updown");
  const [{ marbles }, state] = await Promise.all([playState(user.id), updownState(user.id)]);
  return (
    <>
      <TopBar title="가격 업다운" />
      <UpDown initialMarbles={marbles} initialState={state} />
    </>
  );
}
