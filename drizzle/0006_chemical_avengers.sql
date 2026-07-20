CREATE TABLE "hospital_clearances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_cycle_id" uuid NOT NULL,
	"clearance_status" text NOT NULL,
	"doctor_comments" text NOT NULL,
	"clearance_date" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hospital_clearances" ADD CONSTRAINT "hospital_clearances_workflow_cycle_id_workflow_cycles_id_fk" FOREIGN KEY ("workflow_cycle_id") REFERENCES "public"."workflow_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_active_person_id_idx" ON "engagements" USING btree ("person_id") WHERE "engagements"."workflow_state" not in ('Completed', 'Cancelled');
