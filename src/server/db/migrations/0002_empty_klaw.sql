ALTER TABLE "UTPS_shifts" DROP CONSTRAINT "UTPS_shifts_user_id_UTPS_users_id_fk";
--> statement-breakpoint
ALTER TABLE "UTPS_shifts" DROP COLUMN "user_id";