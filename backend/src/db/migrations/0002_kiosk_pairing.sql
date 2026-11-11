CREATE TABLE `kiosk_pairing_codes` (
	`id` varchar(36) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	`created_by_user_id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `kiosk_pairing_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `kiosk_pairing_codes_code_hash_unique` UNIQUE(`code_hash`)
);
--> statement-breakpoint
ALTER TABLE `kiosks` ADD `token_hash` varchar(64);--> statement-breakpoint
ALTER TABLE `kiosks` ADD `paired_at` timestamp;--> statement-breakpoint
ALTER TABLE `kiosks` ADD CONSTRAINT `kiosks_token_hash_unique` UNIQUE(`token_hash`);--> statement-breakpoint
ALTER TABLE `kiosk_pairing_codes` ADD CONSTRAINT `kiosk_pairing_codes_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kiosk_pairing_codes` ADD CONSTRAINT `kiosk_pairing_codes_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;