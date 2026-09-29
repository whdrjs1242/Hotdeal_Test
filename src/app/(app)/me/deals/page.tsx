import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDeals } from "@/lib/deals";
import { DealCard } from "@/components/DealCard";
import { TopBar, Empty } from "@/components/ui";

export const metadata = { title: "올린 핫딜" };

export default async function MyDealsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me/deals");
  const { items } = await listDeals({ sort: "new", userId: user.id, limit: 50 });
  return (
    <>
      <TopBar title="올린 핫딜" />
      <section className="divide-y divide-line bg-surface">
        {items.map((d) => (
          <DealCard key={d.id} deal={d} />
        ))}
        {items.length === 0 && <Empty title="아직 올린 핫딜이 없어요" action={{ label: "핫딜 공유하기", href: "/submit" }} />}
      </section>
    </>
  );
}
