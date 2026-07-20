ALTER TABLE "hospital_clearances" ADD CONSTRAINT "hospital_clearances_clearance_status_check" CHECK ("hospital_clearances"."clearance_status" in ('Fit', 'FitWithConditions', 'Unfit'));
