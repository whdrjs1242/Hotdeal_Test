import Redis from "ioredis";
import { env } from "./env";

/**
 * Redis가 있으면 Redis, 없으면 프로세스 메모리를 쓰는 얇은 캐시 계층.
 * 피드 캐시 / 레이트리밋 / 조회 카운터 버퍼에 쓰인다.
 */
interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  incr(key: string, ttlSec: number): Promise<number>;
  del(key: string): Promise<void>;
}

class MemoryStore implements Store {
  private m = new Map<string, { v: string; exp: number }>();
  private live(key: string) {
    const e = this.m.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) {
      this.m.delete(key);
      return null;
    }
    return e;
  }
  async get(key: string) {
    return this.live(key)?.v ?? null;
  }
  async set(key: string, value: string, ttlSec: number) {
    if (this.m.size > 10_000) this.m.clear();
    this.m.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
  }
  async incr(key: string, ttlSec: number) {
    const e = this.live(key);
    const n = (e ? Number(e.v) : 0) + 1;
    this.m.set(key, { v: String(n), exp: e?.exp ?? Date.now() + ttlSec * 1000 });
    return n;
  }
  async del(key: string) {
    this.m.delete(key);
  }
}

class RedisStore implements Store {
  constructor(private r: Redis) {
    // 연결 오류는 각 호출에서 처리(캐시 미스로 폴백)하므로 전역 unhandled 로그만 막는다
    r.on("error", () => {});
  }
  get(key: string) {
    return this.r.get(key);
  }
  async set(key: string, value: string, ttlSec: number) {
    await this.r.set(key, value, "EX", ttlSec);
  }
  async incr(key: string, ttlSec: number) {
    const [[, n]] = (await this.r.multi().incr(key).expire(key, ttlSec, "NX").exec()) as [[null, number]];
    return n;
  }
  async del(key: string) {
    await this.r.del(key);
  }
}

const g = globalThis as unknown as { store?: Store };
export const store: Store =
  g.store ??
  (env.redisUrl
    ? new RedisStore(new Redis(env.redisUrl, { maxRetriesPerRequest: 2, lazyConnect: false }))
    : new MemoryStore());
g.store = store;

/** JSON 캐시 헬퍼. 캐시 실패는 서비스 장애로 번지지 않게 무시한다. */
export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await store.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {}
  const value = await load();
  try {
    await store.set(key, JSON.stringify(value), ttlSec);
  } catch {}
  return value;
}

export async function invalidate(...keys: string[]) {
  await Promise.all(keys.map((k) => store.del(k).catch(() => {})));
}

/** 고정 윈도우 레이트리밋. true면 허용. */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  try {
    return (await store.incr(`rl:${key}`, windowSec)) <= limit;
  } catch {
    return true;
  }
}
