CREATE TABLE `follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reply_id` integer NOT NULL,
	`sender_email` text NOT NULL,
	`follow_up_count` integer DEFAULT 0 NOT NULL,
	`next_follow_up_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`last_sent_at` text,
	`cancel_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reply_id`) REFERENCES `replies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_followup_sender_email` ON `follow_ups` (`sender_email`);--> statement-breakpoint
CREATE INDEX `idx_followup_status` ON `follow_ups` (`status`);--> statement-breakpoint
CREATE INDEX `idx_followup_next_at` ON `follow_ups` (`next_follow_up_at`);