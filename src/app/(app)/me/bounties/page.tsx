import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listBounties } from "@/lib/bounties";
import { BountyCard } from "@/components/BountyCard";
import { TopBar, Empty } from "@/components/ui";

export const metadata = { title: "내 수배" };

export default async function MyBountiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/bounties");
  const { items } = await listBounties({ sort: "new", userId: user.id, limit: 50 });
  return (
    <>
      <TopBar title="내 수배" />
      <section className="divide-y divide-line bg-surface">
        {items.map((b) => (
          <BountyCard key={b.id} bounty={b} />
        ))}
        {items.length === 0 && <Empty title="아직 건 수배가 없어요" action={{ label: "수배 걸기", href: "/bounties/new" }} />}
      </section>
    </>
  );
}
