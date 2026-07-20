import { Badge } from "@/components/ui/badge";

type ReceptionSummaryProps = {
  person: {
    fullName: string;
    passportNo: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  };
  accessPurpose: string;
  arrivalDate: string;
  departureDate: string;
  approval:
    | { approverName: string; approverRole: string; approvedAt: Date }
    | undefined;
};

export function ReceptionSummary({
  person,
  accessPurpose,
  arrivalDate,
  departureDate,
  approval,
}: ReceptionSummaryProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Reception Summary
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name" value={person.fullName} />
        <Field label="Passport No." value={person.passportNo} />
        <Field label="Date of Birth" value={person.dateOfBirth} />
        <Field label="Gender" value={person.gender} />
        <Field label="Nationality" value={person.nationality} />
        <Field label="Access Purpose" value={accessPurpose} />
        <Field label="Arrival Date" value={arrivalDate} />
        <Field label="Departure Date" value={departureDate} />
        <Field
          label="Emergency Contact"
          value={`${person.emergencyContactName} — ${person.emergencyContactPhone}`}
        />
      </div>
      <div className="mt-6 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Stakeholder Approval
        </span>
        {approval ? (
          <Badge className="bg-status-success-bg text-status-success-fg">
            Approved by {approval.approverName} ({approval.approverRole}) on{" "}
            {approval.approvedAt.toLocaleDateString()}
          </Badge>
        ) : (
          <Badge className="bg-status-warning-bg text-status-warning-fg">
            Awaiting approval
          </Badge>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
