/**
 * 디버그: 실행 중인 Next 앱이 보는 DB 집계
 * GET /api/debug/db-stats → 대시보드와 동일한 DB로 조회한 값
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { fanLetters } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.DATABASE_URL ?? "";
    const dbHint = url.startsWith("file:")
      ? `file:...${url.slice(-20)}`
      : url
        ? "remote"
        : "unset";

    const [row] = await db
      .select({
        total: sql<number>`count(*)`,
        unread: sql<number>`sum(case when is_read = 0 then 1 else 0 end)`,
        unreplied: sql<number>`sum(case when is_replied = 0 then 1 else 0 end)`,
        maxId: sql<number>`max(id)`,
      })
      .from(fanLetters);

    return NextResponse.json({
      ok: true,
      database: dbHint,
      total: row?.total ?? 0,
      unread: Number(row?.unread ?? 0),
      unreplied: row?.unreplied ?? 0,
      maxLetterId: row?.maxId ?? null,
    });
  } catch (e) {
    console.error("[debug/db-stats]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
