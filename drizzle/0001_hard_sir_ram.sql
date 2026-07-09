ALTER TABLE "notifications" ADD COLUMN "requester_staff_user_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requester_staff_user_id_staff_users_id_fk" FOREIGN KEY ("requester_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
