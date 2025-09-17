ALTER TABLE `jobs` ADD `onchain_id` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `onchain_tx` text;--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_onchain_id_unique` ON `jobs` (`onchain_id`);