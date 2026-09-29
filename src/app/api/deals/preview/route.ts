import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, limit, parseBody, requireUser } from "@/lib/api";
import { previewLink } from "@/lib/dealService";

export const POST = handler(async (req) => {
  const user = await requireUser();
  await limit(`preview:${user.id}`, 30, 300);
  const { url } = await parseBody(req, z.object({ url: z.string().min(8).max(2000) }));
  return NextResponse.json(await previewLink(url));
});
