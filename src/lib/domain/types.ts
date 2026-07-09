export type SystemRole = "User" | "Guest" | "Admin" | "SystemAdmin";

export type WorkflowRole =
  | "Receptionist"
  | "HCM"
  | "GMM"
  | "DMD"
  | "HospitalStaff"
  | "TrainingStaff"
  | "SecurityStaff"
  | "ITStaff";

export type ActionResult =
  | { success: true; warning?: string }
  | { success: false; error: string };
