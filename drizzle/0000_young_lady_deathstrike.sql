CREATE TABLE `compute_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`address` text NOT NULL,
	`compute_power` real NOT NULL,
	`reputation` real DEFAULT 100,
	`is_active` integer DEFAULT true,
	`total_earnings` real DEFAULT 0,
	`last_heartbeat` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `compute_nodes_address_unique` ON `compute_nodes` (`address`);--> statement-breakpoint
CREATE TABLE `earnings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`job_id` integer,
	`amount` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`reward` integer NOT NULL,
	`status` text NOT NULL,
	`required_nodes` integer NOT NULL,
	`deadline` integer NOT NULL,
	`requester_user_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`requester_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`address` text NOT NULL,
	`username` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_address_unique` ON `users` (`address`);