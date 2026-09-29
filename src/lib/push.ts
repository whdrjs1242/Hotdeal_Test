import webpush from "web-push";
import { env } from "./env";
import { sql } from "./db";

let configured = false;
function ensure() {
  if (configured) return true;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  image?: string | null;
  tag?: string;
}

/** 사용자들의 모든 기기로 웹푸시 발송. 만료된 구독(404/410)은 정리한다. */
export async function pushToUsers(userIds: number[], payload: PushPayload) {
  if (!userIds.length || !ensure()) return 0;
  const subs = await sql<{ id: number; endpoint: string; p256dh: string; auth: string }[]>`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN ${sql(userIds)}`;
  let sent = 0;
  const dead: number[] = [];
  const body = JSON.stringify(payload);
  // 동시성 제한을 둔 배치 발송
  for (let i = 0; i < subs.length; i += 50) {
    await Promise.all(
      subs.slice(i, i + 50).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
            TTL: 60 * 60 * 6,
            urgency: "high",
          });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
        }
      }),
    );
  }
  if (dead.length) await sql`DELETE FROM push_subscriptions WHERE id IN ${sql(dead)}`;
  return sent;
}
