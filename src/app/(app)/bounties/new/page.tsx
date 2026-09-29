import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BOUNTY_POLICY } from "@/lib/rewards";
import { BountyForm } from "@/components/BountyForm";
import { TopBar } from "@/components/ui";

export const metadata = { title: "수배 요청" };

export default async function NewBountyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bounties/new");
  return (
    <>
      <TopBar title="수배 요청" />
      <BountyForm balance={user.pointsAvailable} minStake={BOUNTY_POLICY.minStake} maxDays={BOUNTY_POLICY.maxDays} />
    </>
  );
}
