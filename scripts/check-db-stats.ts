/**
 * DB 집계 값 확인 (대시보드와 일치 여부 검증용)
 * 프로젝트 루트에서: npx tsx scripts/check-db-stats.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { db } from "../db";
import { fanLetters } from "../db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const dbHint = url.startsWith("file:")
    ? `file:${path.basename(url.replace("file:", ""))}`
    : url ? "remote (turso 등)" : "미설정";

  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      unread: sql<number>`sum(case when is_read = 0 then 1 else 0 end)`,
      unreplied: sql<number>`sum(case when is_replied = 0 then 1 else 0 end)`,
      maxId: sql<number>`max(id)`,
    })
    .from(fanLetters);

  console.log("=== DB 집계 (현재 프로세스 기준) ===");
  console.log("DATABASE_URL:", dbHint);
  console.log("전체 팬레터 (total):", counts?.total ?? 0);
  console.log("읽지 않은 (unread):", Number(counts?.unread ?? 0));
  console.log("미답장 (unreplied):", counts?.unreplied ?? 0);
  console.log("fan_letters 최대 id (maxId):", counts?.maxId ?? null);
  console.log("\n대시보드 숫자와 위 값이 다르면, PM2 앱의 작업 디렉터리/환경이 다를 수 있습니다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
