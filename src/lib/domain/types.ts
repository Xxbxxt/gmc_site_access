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

export type AccessPurpose = "Work" | "Visit" | "VisitMine";

export type WorkflowState =
  | "Draft"
  | "AtReception"
  | "AtHospital"
  | "AtTraining"
  | "AtSecurity"
  | "AwaitingProvisioning"
  | "Completed"
  | "Cancelled";

export type AccessState =
  | "Pending"
  | "Active"
  | "Expired"
  | "TerminationRequested"
  | "Terminated";

export type DocType =
  | "passport_biodata"
  | "valid_visa"
  | "mincom_letter"
  | "work_residence_permit"
  | "ghana_card"
  | "assignment_letter"
  | "insurance_proof";

export type ApproverRole = "HCM" | "GMM" | "DMD" | "Delegated";

export type VisaType =
  | "Tourist Visa"
  | "Business Visa"
  | "Work Visa"
  | "Transit Visa"
  | "Diplomatic Visa"
  | "Other";

export type TerminationStatus = "Pending" | "Approved" | "Rejected";

export type ReceptionData = {
  employmentStatus: string;
  telephoneOnSite: string;
  companyName: string;
  contactNameMonthly: string;
  contactEmail: string;
  companyEmergencyName: string;
  companyEmergencyTel: string;
  gmcLiaisonPerson: string;
  gmcLiaisonDept: string;
  reasonForRequest: string;
  airportPickup: boolean;
  transportTo: string;
  transportFrom: string;
  accommodationRequired: boolean;
  permanentAccessBadge: boolean;
  ghanaVisaRequired: boolean;
  generalSiteInduction: boolean;
  otherInductions: string;
  bringingEquipment: boolean;
  ppeRequired: boolean;
  itAccessRequired: boolean;
  visaType: VisaType;
  accessLevel: string;
  accommodationConfirmed: boolean;
  itineraryAttached: boolean;
  inflightUpdated: boolean;
  remarks: string;
  applicableDocuments: DocType[];
};
