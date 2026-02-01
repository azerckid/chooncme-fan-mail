import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const fanLetters = sqliteTable("fan_letters", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    content: text("content").notNull(),
    senderNickname: text("sender_nickname").notNull(),
    senderContact: text("sender_contact"),
    receivedAt: integer("received_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const replies = sqliteTable("replies", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    letterId: text("letter_id").references(() => fanLetters.id).notNull(),
    content: text("content").notNull(),
    sentimentScore: real("sentiment_score"),
    modelVersion: text("model_version"),
    repliedAt: integer("replied_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    letterIdIdx: index("letter_id_idx").on(table.letterId),
}));
