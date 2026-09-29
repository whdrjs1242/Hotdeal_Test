import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await sql<{ id: number; updatedAt: Date }[]>`
    SELECT id, updated_at FROM deals WHERE status <> 'hidden' ORDER BY id DESC LIMIT 5000`;
  return [
    { url: env.siteUrl, changeFrequency: "always", priority: 1 },
    ...deals.map((d) => ({ url: `${env.siteUrl}/deals/${d.id}`, lastModified: d.updatedAt })),
  ];
}
