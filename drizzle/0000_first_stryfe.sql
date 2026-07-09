CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_staff_user_id" uuid NOT NULL,
	"engagement_id" uuid,
	"message" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entra_object_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"system_role" text NOT NULL,
	"workflow_roles" text[] DEFAULT '{}' NOT NULL,
	"pin_hash" text,
	"pin_failed_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"provisioned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_entraObjectId_unique" UNIQUE("entra_object_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_staff_user_id_staff_users_id_fk" FOREIGN KEY ("recipient_staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
