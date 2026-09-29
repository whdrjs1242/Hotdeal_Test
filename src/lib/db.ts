import postgres from "postgres";
import { env } from "./env";

// 서버리스/개발 HMR 환경에서 커넥션 풀이 중복 생성되지 않도록 전역에 보관한다.
// 운영에서는 PgBouncer(transaction mode) 또는 Supabase pooler 앞단을 권장 → prepare: false.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(env.databaseUrl, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    prepare: process.env.DB_PREPARE === "true",
    transform: postgres.camel,
    // int8(id, count)를 JS number로 받는다. 9천조 미만이라 안전하며 JSON 직렬화가 단순해진다.
    types: { int8: { to: 20, from: [20], serialize: (v: number) => String(v), parse: (v: string) => Number(v) } },
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
