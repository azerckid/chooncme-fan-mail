import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const fanLetters = sqliteTable("fan_letters", {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // 이메일 메타데이터
    emailId: text("email_id").unique(),           // 원본 이메일 ID (중복 방지)
    subject: text("subject"),                      // 이메일 제목
    senderName: text("sender_name").notNull(),     // 발신자 이름
    senderEmail: text("sender_email").notNull(),   // 발신자 이메일

    // 본문
    content: text("content").notNull(),

    // 분석 데이터 (춘심AI가 분석하여 전달)
    language: text("language"),                    // 'ko', 'en', 'ja' 등
    country: text("country"),                      // 'KR', 'US' 등
    sentiment: text("sentiment"),                  // 'positive', 'neutral', 'negative'
    sentimentScore: real("sentiment_score"),       // 0.0 ~ 1.0
    topics: text("topics"),                        // JSON 문자열: ["응원", "질문"]

    // 상태
    isRead: integer("is_read", { mode: "boolean" }).default(false),
    isStarred: integer("is_starred", { mode: "boolean" }).default(false),
    isReplied: integer("is_replied", { mode: "boolean" }).default(false),
    repliedAt: text("replied_at"),                // 답장 일시 (ISO 8601). NULL이면 미답장

    // 타임스탬프
    receivedAt: text("received_at"),              // 이메일 수신 시간 (ISO String)
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    senderEmailIdx: index("idx_sender_email").on(table.senderEmail),
    languageIdx: index("idx_language").on(table.language),
    countryIdx: index("idx_country").on(table.country),
    sentimentIdx: index("idx_sentiment").on(table.sentiment),
    isReadIdx: index("idx_is_read").on(table.isRead),
    isRepliedIdx: index("idx_is_replied").on(table.isReplied),
    receivedAtIdx: index("idx_received_at").on(table.receivedAt),
}));

export const replies = sqliteTable("replies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    letterId: integer("letter_id").references(() => fanLetters.id).notNull(),
    content: text("content").notNull(),

    // 이메일 발송 상태
    emailSent: integer("email_sent", { mode: "boolean" }).default(false),
    emailSentAt: text("email_sent_at"),

    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    letterIdIdx: index("idx_reply_letter_id").on(table.letterId),
}));

export const followUps = sqliteTable("follow_ups", {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // 원본 답장 참조
    replyId: integer("reply_id").references(() => replies.id).notNull(),

    // 발신자 이메일 (효율적인 조회를 위해 비정규화)
    senderEmail: text("sender_email").notNull(),

    // 팔로업 카운트 (0 = 첫 팔로업 대기 중, 1 = 첫 팔로업 발송됨, ...)
    followUpCount: integer("follow_up_count").default(0).notNull(),

    // 다음 팔로업 예정일 (ISO 8601)
    nextFollowUpAt: text("next_follow_up_at").notNull(),

    // 상태: 'pending' | 'completed' | 'cancelled'
    status: text("status").default("pending").notNull(),

    // 마지막 팔로업 발송일
    lastSentAt: text("last_sent_at"),

    // 취소 사유 (cancelled 상태인 경우)
    cancelReason: text("cancel_reason"),

    // 타임스탬프
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    senderEmailIdx: index("idx_followup_sender_email").on(table.senderEmail),
    statusIdx: index("idx_followup_status").on(table.status),
    nextFollowUpAtIdx: index("idx_followup_next_at").on(table.nextFollowUpAt),
}));
