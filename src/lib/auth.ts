import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import { sql } from "./db";

export const SESSION_COOKIE = "jj_session";
export const REF_COOKIE = "jj_ref";
const key = () => new TextEncoder().encode(env.authSecret);

export interface SessionUser {
  id: number;
  nickname: string;
  handle: string | null;
  refCode: string;
  xp: number;
  pointsAvailable: number;
  pointsPending: number;
  avatarUrl: string | null;
}

export async function createSessionToken(userId: number) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(key());
}

export async function readSessionToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 90,
};

/** 요청 단위로 memoize 된 현재 사용자 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const uid = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const [u] = await sql<SessionUser[]>`
    SELECT id, nickname, handle, ref_code, xp, points_available, points_pending, avatar_url
    FROM users WHERE id = ${uid}`;
  return u ?? null;
});

export function isAdmin(userId: number | undefined | null) {
  return userId != null && env.adminUserIds.includes(String(userId));
}

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export function randomCode(len = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** 신규 가입. 초대 코드가 있으면 referred_by 연결 */
export async function createUser(input: { nickname: string; kakaoId?: string; avatarUrl?: string | null; refCode?: string | null }) {
  const referrer = input.refCode
    ? (await sql<{ id: number }[]>`SELECT id FROM users WHERE ref_code = ${input.refCode}`)[0]
    : undefined;
  let nickname = input.nickname.trim().slice(0, 20) || "줍러";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [u] = await sql<{ id: number }[]>`
        INSERT INTO users (nickname, kakao_id, avatar_url, ref_code, referred_by)
        VALUES (${nickname}, ${input.kakaoId ?? null}, ${input.avatarUrl ?? null}, ${randomCode()}, ${referrer?.id ?? null})
        RETURNING id`;
      return u.id;
    } catch (e) {
      if ((e as { code?: string }).code !== "23505") throw e;
      nickname = `${input.nickname.trim().slice(0, 15) || "줍러"}${Math.floor(Math.random() * 9000 + 1000)}`;
    }
  }
  throw new Error("could not create user");
}
