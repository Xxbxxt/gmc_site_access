ALTER TABLE "engagements" ADD COLUMN "delegated_approver_id" uuid;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "delegation_granted_by" uuid;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "delegation_granted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "engagements" ADD COLUMN "delegation_reason" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_delegated_approver_id_staff_users_id_fk" FOREIGN KEY ("delegated_approver_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_delegation_granted_by_staff_users_id_fk" FOREIGN KEY ("delegation_granted_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
