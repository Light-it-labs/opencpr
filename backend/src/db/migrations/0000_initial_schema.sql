CREATE TABLE `access_requests` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`reviewed_by_user_id` varchar(36),
	`reviewed_at` timestamp,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `access_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_requests_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `auth_challenges` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`kind` varchar(16) NOT NULL,
	`challenge` text NOT NULL,
	`expires_at` timestamp NOT NULL,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `auth_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cpr_compressions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cpr_session_id` int NOT NULL,
	`timestamp_ms` float,
	`start_depth_mm` float NOT NULL,
	`end_depth_mm` float NOT NULL,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `cpr_compressions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cpr_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`public_id` varchar(36) NOT NULL,
	`registration_id` varchar(36),
	`location_id` varchar(36) NOT NULL,
	`kiosk_id` varchar(36),
	`build_id` varchar(64),
	`participant_id` varchar(36),
	`total_compressions` int NOT NULL DEFAULT 0,
	`total_full_compressions` int NOT NULL DEFAULT 0,
	`total_full_rebounds` int NOT NULL DEFAULT 0,
	`average_compression_end_depth_mm` float NOT NULL DEFAULT 0,
	`compressions_on_bpm_range` int NOT NULL DEFAULT 0,
	`average_bpm` float NOT NULL DEFAULT 0,
	`score` float NOT NULL DEFAULT 0,
	`duration_ms` int,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `cpr_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `cpr_sessions_public_id_unique` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` varchar(36) NOT NULL,
	`name` text NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`opens_at` time,
	`closes_at` time,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`alerts_enabled` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` varchar(36) NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`email` text NOT NULL,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_claims` (
	`public_id` varchar(36) NOT NULL,
	`participant_id` varchar(36) NOT NULL,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `session_claims_public_id` PRIMARY KEY(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `kiosks` (
	`kiosk_id` varchar(36) NOT NULL,
	`location_id` varchar(36),
	`serial_status` varchar(32),
	`serial_ok_at` timestamp,
	`baseline_mm` float,
	`build_id` varchar(64),
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `kiosks_kiosk_id` PRIMARY KEY(`kiosk_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`role` varchar(16) NOT NULL DEFAULT 'viewer',
	`invited_by_user_id` varchar(36),
	`last_login_at` timestamp,
	`last_seen_at` timestamp,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `magic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_links_tokenHash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`credential_id` varchar(512) NOT NULL,
	`public_key` text NOT NULL,
	`counter` bigint NOT NULL DEFAULT 0,
	`transports` text,
	`device_type` varchar(32),
	`backed_up` boolean NOT NULL DEFAULT false,
	`last_used_at` timestamp,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `passkeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkeys_credentialId_unique` UNIQUE(`credential_id`)
);
--> statement-breakpoint
CREATE TABLE `kiosk_alerts` (
	`kiosk_id` varchar(36) NOT NULL,
	`state` varchar(16) NOT NULL,
	`updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`deleted_at` timestamp,
	CONSTRAINT `kiosk_alerts_kiosk_id` PRIMARY KEY(`kiosk_id`)
);
--> statement-breakpoint
CREATE TABLE `user_locations` (
	`user_id` varchar(36) NOT NULL,
	`location_id` varchar(36) NOT NULL,
	CONSTRAINT `user_locations_user_id_location_id_pk` PRIMARY KEY(`user_id`,`location_id`)
);
--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cpr_compressions` ADD CONSTRAINT `cpr_compressions_cpr_session_id_cpr_sessions_id_fk` FOREIGN KEY (`cpr_session_id`) REFERENCES `cpr_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cpr_sessions` ADD CONSTRAINT `cpr_sessions_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cpr_sessions` ADD CONSTRAINT `cpr_sessions_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session_claims` ADD CONSTRAINT `session_claims_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kiosks` ADD CONSTRAINT `kiosks_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `magic_links` ADD CONSTRAINT `magic_links_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passkeys` ADD CONSTRAINT `passkeys_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_locations` ADD CONSTRAINT `user_locations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_locations` ADD CONSTRAINT `user_locations_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_sessions_expires_at_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `cpr_sessions_location_id_created_at_idx` ON `cpr_sessions` (`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `passkeys_user_id_created_at_idx` ON `passkeys` (`user_id`,`created_at`);