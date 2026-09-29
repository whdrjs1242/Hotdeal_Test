import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from "zod";
import { getCurrentUser, type SessionUser } from "./auth";
import { rateLimit } from "./cache";
import { InvalidUrlError } from "./affiliate";
import { BountyError } from "./bounties";
import { InsufficientPointsError } from "./rewards";
import { MarketError } from "./market";
import { GameError } from "./games";
import { QuestionError } from "./questions";
import { PlayError } from "./play";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
}

export function ipHash(req: NextRequest) {
  return createHash("sha256").update(clientIp(req) + (process.env.AUTH_SECRET ?? "")).digest("hex").slice(0, 24);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "로그인이 필요해요");
  return user;
}

export async function limit(key: string, max: number, windowSec: number) {
  if (!(await rateLimit(key, max, windowSec))) throw new ApiError(429, "잠시 후 다시 시도해주세요");
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<ZodInfer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "잘못된 요청이에요");
  }
  return schema.parse(json);
}

/** 라우트 핸들러 래퍼: 에러를 일관된 JSON 응답으로 변환 */
export function handler<C>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (
        e instanceof BountyError ||
        e instanceof InsufficientPointsError ||
        e instanceof MarketError ||
        e instanceof GameError ||
        e instanceof QuestionError ||
        e instanceof PlayError
      ) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      if (e instanceof InvalidUrlError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "입력값을 확인해주세요", issues: e.issues }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "일시적인 오류가 발생했어요" }, { status: 500 });
    }
  };
}

export function idParam(raw: string) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(404, "없는 딜이에요");
  return id;
}
