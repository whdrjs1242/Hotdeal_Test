import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BOUNTY_POLICY } from "@/lib/rewards";
import { BountyForm } from "@/components/BountyForm";

export const metadata = { title: "수배지 걸기" };

export default async function NewBountyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bounties/new");
  return (
    <div className="pt-safe px-4">
      <h1 className="pt-5 text-xl font-black">🎯 수배지 걸기</h1>
      <p className="mt-1 text-sm text-sub">찾는 상품과 목표가를 적고 현상금을 걸어주세요. 헌터들이 대신 찾아옵니다.</p>
      <BountyForm balance={user.pointsAvailable} minStake={BOUNTY_POLICY.minStake} maxDays={BOUNTY_POLICY.maxDays} />
    </div>
  );
}
