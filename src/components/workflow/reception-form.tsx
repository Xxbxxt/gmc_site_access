"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  type Control,
  Controller,
  type FieldPath,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  lookupPersonByPassportAction,
  submitReceptionAction,
  updateReceptionDataAction,
} from "@/actions/engagements";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentSelector } from "@/components/workflow/document-selector";
import { PhoneInput } from "@/components/workflow/phone-input";
import type { DocType } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";
import { toSentenceCase, toTitleCase } from "@/lib/utils";

const ACCESS_LEVEL_OPTIONS = [
  "Visitor Access",
  "Contractor/Service Personnel Access",
  "Standard Employee Access",
  "Operational Employee Access",
  "High Security / Sensitive Areas",
  "Executive / Emergency Access",
];

const VISA_TYPE_OPTIONS = [
  "Tourist Visa",
  "Business Visa",
  "Work Visa",
  "Transit Visa",
  "Diplomatic Visa",
  "Other",
];

type Casing = "title" | "sentence" | "none";

function applyCasing(value: string, casing: Casing): string {
  if (casing === "none") return value;
  return casing === "title" ? toTitleCase(value) : toSentenceCase(value);
}

const phoneFieldSchema = z.string().superRefine((value, ctx) => {
  const [code, ...rest] = value.trim().split(/\s+/);
  const number = rest.join(" ");
  if (!code || !code.startsWith("+")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a country code",
    });
    return;
  }
  if (!number) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
  }
});

const receptionFormSchema = z.object({
  passportNo: z.string().min(1, "Required"),
  fullName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.string().min(1, "Required"),
  nationality: z.string().min(1, "Required"),
  email: z.string().email("Enter a valid email"),
  phone: phoneFieldSchema,
  telephoneOnSite: phoneFieldSchema,
  emergencyContactName: z.string().min(1, "Required"),
  emergencyContactPhone: phoneFieldSchema,
  employmentStatus: z.string().min(1, "Required"),
  accessPurpose: z.enum(["Work", "Visit", "VisitMine"]),
  arrivalDate: z.string().min(1, "Required"),
  departureDate: z.string().min(1, "Required"),
  companyName: z.string().min(1, "Required"),
  contactNameMonthly: z.string().min(1, "Required"),
  contactEmail: z.string().email("Enter a valid email"),
  companyEmergencyName: z.string().min(1, "Required"),
  companyEmergencyTel: phoneFieldSchema,
  gmcLiaisonPerson: z.string().min(1, "Required"),
  gmcLiaisonDept: z.string().min(1, "Required"),
  reasonForRequest: z.string().min(1, "Required"),
  airportPickup: z.boolean(),
  transportTo: z.string().min(1, "Required"),
  transportFrom: z.string().min(1, "Required"),
  accommodationRequired: z.boolean(),
  permanentAccessBadge: z.boolean(),
  ghanaVisaRequired: z.boolean(),
  generalSiteInduction: z.boolean(),
  otherInductions: z.string().min(1, "Required"),
  bringingEquipment: z.boolean(),
  ppeRequired: z.boolean(),
  itAccessRequired: z.boolean(),
  visaType: z.enum([
    "Tourist Visa",
    "Business Visa",
    "Work Visa",
    "Transit Visa",
    "Diplomatic Visa",
    "Other",
  ]),
  accessLevel: z.string().min(1, "Required"),
  accommodationConfirmed: z.boolean(),
  itineraryAttached: z.boolean(),
  inflightUpdated: z.boolean(),
  remarks: z.string(),
  applicableDocuments: z.array(
    z.enum([
      "passport_biodata",
      "valid_visa",
      "mincom_letter",
      "work_residence_permit",
      "ghana_card",
      "assignment_letter",
      "insurance_proof",
    ]),
  ),
});

export type ReceptionFormValues = z.infer<typeof receptionFormSchema>;

type ReceptionFormProps = {
  engagementId?: string;
  defaultValues?: Partial<ReceptionFormValues>;
  uploadedDocuments?: Document[];
  readOnly?: boolean;
  allowLookup?: boolean;
};

const DEFAULT_VALUES: ReceptionFormValues = {
  passportNo: "",
  fullName: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  email: "",
  phone: "",
  telephoneOnSite: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  employmentStatus: "",
  accessPurpose: "Work",
  arrivalDate: "",
  departureDate: "",
  companyName: "",
  contactNameMonthly: "",
  contactEmail: "",
  companyEmergencyName: "",
  companyEmergencyTel: "",
  gmcLiaisonPerson: "",
  gmcLiaisonDept: "",
  reasonForRequest: "",
  airportPickup: false,
  transportTo: "",
  transportFrom: "",
  accommodationRequired: false,
  permanentAccessBadge: false,
  ghanaVisaRequired: false,
  generalSiteInduction: false,
  otherInductions: "",
  bringingEquipment: false,
  ppeRequired: false,
  itAccessRequired: false,
  visaType: "Tourist Visa",
  accessLevel: "",
  accommodationConfirmed: false,
  itineraryAttached: false,
  inflightUpdated: false,
  remarks: "",
  applicableDocuments: [],
};

export function ReceptionForm({
  engagementId,
  defaultValues,
  uploadedDocuments = [],
  readOnly = false,
  allowLookup = false,
}: ReceptionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [activeEngagementId, setActiveEngagementId] = useState<string | null>(
    null,
  );
  const [pendingFiles, setPendingFiles] = useState<
    Partial<Record<DocType, File>>
  >({});

  const form = useForm<ReceptionFormValues>({
    resolver: zodResolver(receptionFormSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const watchedPassportNo = form.watch("passportNo");
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs only when the passport number itself changes, to clear a stale lookup warning — the value isn't read in the effect body
  useEffect(() => {
    setActiveEngagementId(null);
  }, [watchedPassportNo]);

  async function handleLookup() {
    const passportNo = form.getValues("passportNo");
    if (!passportNo) {
      toast.error("Enter a passport number first");
      return;
    }
    setIsLookingUp(true);
    try {
      const found = await lookupPersonByPassportAction(passportNo);
      setActiveEngagementId(found?.activeEngagementId ?? null);
      if (found) {
        for (const [key, value] of Object.entries(found.person)) {
          form.setValue(key as FieldPath<ReceptionFormValues>, value, {
            shouldValidate: false,
          });
        }
        toast.success("Existing visitor found — fields pre-filled");
      } else {
        toast.warning(
          "No visitor found for this passport — enter details below",
        );
      }
    } catch {
      toast.error("Lookup failed — try again");
    } finally {
      setIsLookingUp(false);
    }
  }

  function onSubmit(values: ReceptionFormValues) {
    startTransition(async () => {
      const { applicableDocuments, ...rest } = values;
      const payload = {
        person: {
          passportNo: values.passportNo,
          fullName: values.fullName,
          dateOfBirth: values.dateOfBirth,
          gender: values.gender,
          nationality: values.nationality,
          email: values.email,
          phone: values.phone,
          emergencyContactName: values.emergencyContactName,
          emergencyContactPhone: values.emergencyContactPhone,
        },
        accessPurpose: values.accessPurpose,
        arrivalDate: values.arrivalDate,
        departureDate: values.departureDate,
        receptionData: {
          employmentStatus: rest.employmentStatus,
          telephoneOnSite: rest.telephoneOnSite,
          companyName: rest.companyName,
          contactNameMonthly: rest.contactNameMonthly,
          contactEmail: rest.contactEmail,
          companyEmergencyName: rest.companyEmergencyName,
          companyEmergencyTel: rest.companyEmergencyTel,
          gmcLiaisonPerson: rest.gmcLiaisonPerson,
          gmcLiaisonDept: rest.gmcLiaisonDept,
          reasonForRequest: rest.reasonForRequest,
          airportPickup: rest.airportPickup,
          transportTo: rest.transportTo,
          transportFrom: rest.transportFrom,
          accommodationRequired: rest.accommodationRequired,
          permanentAccessBadge: rest.permanentAccessBadge,
          ghanaVisaRequired: rest.ghanaVisaRequired,
          generalSiteInduction: rest.generalSiteInduction,
          otherInductions: rest.otherInductions,
          bringingEquipment: rest.bringingEquipment,
          ppeRequired: rest.ppeRequired,
          itAccessRequired: rest.itAccessRequired,
          visaType: rest.visaType,
          accessLevel: rest.accessLevel,
          accommodationConfirmed: rest.accommodationConfirmed,
          itineraryAttached: rest.itineraryAttached,
          inflightUpdated: rest.inflightUpdated,
          remarks: rest.remarks,
          applicableDocuments,
        },
      };

      if (engagementId) {
        const result = await updateReceptionDataAction(engagementId, payload);
        if (result.success) {
          if (result.warning) {
            toast.warning(result.warning);
          } else {
            toast.success("Reception record updated");
          }
        } else {
          toast.error(result.error);
        }
        return;
      }

      const result = await submitReceptionAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success("Engagement created");
      }
      await uploadPendingFiles(result.engagementId);
      router.push(`/dashboard/reception/${result.engagementId}`);
    });
  }

  async function uploadPendingFiles(newEngagementId: string) {
    const entries = Object.entries(pendingFiles) as [DocType, File][];
    const failed: string[] = [];

    for (const [docType, file] of entries) {
      const formData = new FormData();
      formData.set("engagementId", newEngagementId);
      formData.set("docType", docType);
      formData.set("file", file);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      }).catch(() => null);
      const body = response ? await response.json().catch(() => null) : null;

      if (!body?.success) {
        failed.push(docType);
      }
    }

    if (failed.length > 0) {
      toast.warning(
        `Some documents failed to upload (${failed.join(", ")}) — add them from the record page.`,
      );
    }
  }

  const disabled = readOnly || isPending;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Visitor Details
          </h2>
          {activeEngagementId && (
            <Alert variant="destructive">
              <AlertTitle>
                This passport already has an active engagement
              </AlertTitle>
              <AlertDescription>
                Open that record instead of creating a new one.{" "}
                <Link
                  href={`/dashboard/reception/${activeEngagementId}`}
                  className="underline"
                >
                  View existing engagement
                </Link>
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <PassportField
              control={form.control}
              disabled={disabled || !!engagementId}
              showLookup={allowLookup && !engagementId}
              isLookingUp={isLookingUp}
              onLookup={handleLookup}
            />
            <SelectField
              control={form.control}
              name="employmentStatus"
              label="Employment Status"
              options={["Employee", "Contractor", "Visitor(Expatriate)"]}
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="fullName"
              label="Full Name"
              casing="title"
              disabled={disabled}
            />
            <DateField
              control={form.control}
              name="dateOfBirth"
              label="Date of Birth"
              disabled={disabled}
            />
            <SelectField
              control={form.control}
              name="gender"
              label="Gender"
              options={["Male", "Female", "Other"]}
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="nationality"
              label="Nationality"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="email"
              label="Email Address"
              type="email"
              casing="none"
              disabled={disabled}
            />
            <PhoneField
              control={form.control}
              name="phone"
              label="Telephone No. (Off Site)"
              disabled={disabled}
            />
            <PhoneField
              control={form.control}
              name="telephoneOnSite"
              label="Telephone No. (On Site)"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="emergencyContactName"
              label="Emergency Contact Name"
              casing="title"
              disabled={disabled}
            />
            <PhoneField
              control={form.control}
              name="emergencyContactPhone"
              label="Emergency Contact No."
              disabled={disabled}
            />
            <SelectField
              control={form.control}
              name="accessPurpose"
              label="Access Purpose"
              options={["Work", "Visit", "VisitMine"]}
              optionLabels={{
                Work: "Coming to work",
                Visit: "Coming to visit (no mine site access)",
                VisitMine: "Coming to visit + mine site access",
              }}
              disabled={disabled}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Company Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="col-span-2">
              <TextField
                control={form.control}
                name="companyName"
                label="Company Name"
                casing="title"
                disabled={disabled}
              />
            </div>
            <TextField
              control={form.control}
              name="contactNameMonthly"
              label="Contact Name (Monthly Reporting)"
              casing="title"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="contactEmail"
              label="Contact Email Address"
              type="email"
              casing="none"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="companyEmergencyName"
              label="Emergency Contact (Company)"
              casing="title"
              disabled={disabled}
            />
            <PhoneField
              control={form.control}
              name="companyEmergencyTel"
              label="Emergency Tel. (Company)"
              disabled={disabled}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Access Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <TextField
              control={form.control}
              name="gmcLiaisonPerson"
              label="GMC Liaison Person"
              casing="title"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="gmcLiaisonDept"
              label="GMC Liaison Department"
              disabled={disabled}
            />
            <DateField
              control={form.control}
              name="arrivalDate"
              label="Date of Arrival"
              disabled={disabled}
            />
            <DateField
              control={form.control}
              name="departureDate"
              label="Date of Departure"
              disabled={disabled}
            />
            <div className="col-span-2">
              <TextAreaField
                control={form.control}
                name="reasonForRequest"
                label="Reason for Request"
                disabled={disabled}
              />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Site Support Requirements
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <YesNoField
              control={form.control}
              name="airportPickup"
              label="Airport Pickup / Protocol Required"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="accommodationRequired"
              label="Accommodation Required"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="permanentAccessBadge"
              label="Permanent Access Badge"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="ghanaVisaRequired"
              label="Ghana Visa Required"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="generalSiteInduction"
              label="General Site Induction"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="bringingEquipment"
              label="Bringing Equipment on Site"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="ppeRequired"
              label="PPE Required"
              disabled={disabled}
            />
            <YesNoField
              control={form.control}
              name="itAccessRequired"
              label="IT Access Required"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="transportTo"
              label="Transport Required To"
              disabled={disabled}
            />
            <TextField
              control={form.control}
              name="transportFrom"
              label="Transport Required From"
              disabled={disabled}
            />
            <div className="col-span-2">
              <TextField
                control={form.control}
                name="otherInductions"
                label="Other Inductions / Training"
                disabled={disabled}
              />
            </div>
            <SelectField
              control={form.control}
              name="visaType"
              label="Visa Type"
              options={VISA_TYPE_OPTIONS}
              disabled={disabled}
            />
            <SelectField
              control={form.control}
              name="accessLevel"
              label="Access Level"
              options={ACCESS_LEVEL_OPTIONS}
              disabled={disabled}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Applicable Document Uploads
          </h2>
          <Controller
            control={form.control}
            name="applicableDocuments"
            render={({ field }) => (
              <DocumentSelector
                engagementId={engagementId}
                value={field.value}
                onChange={field.onChange}
                uploadedDocuments={uploadedDocuments}
                pendingFiles={pendingFiles}
                onPendingFilesChange={setPendingFiles}
                disabled={disabled}
              />
            )}
          />
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Administration
          </h2>
          <CheckboxField
            control={form.control}
            name="accommodationConfirmed"
            label="Accommodation Confirmed"
            disabled={disabled}
          />
          <CheckboxField
            control={form.control}
            name="itineraryAttached"
            label="Itinerary Attached"
            disabled={disabled}
          />
          <CheckboxField
            control={form.control}
            name="inflightUpdated"
            label="Inflight Updated"
            disabled={disabled}
          />
          <TextAreaField
            control={form.control}
            name="remarks"
            label="Remarks / Other Information"
            required={false}
            disabled={disabled}
          />
        </Card>

        {!readOnly && (
          <Button
            type="submit"
            loading={isPending}
            disabled={!!activeEngagementId}
            className="w-fit"
          >
            {engagementId ? "Save Changes" : "Create Engagement"}
          </Button>
        )}
      </form>
    </Form>
  );
}

type FieldProps<TName extends FieldPath<ReceptionFormValues>> = {
  control: Control<ReceptionFormValues>;
  name: TName;
  label: string;
  disabled?: boolean;
  required?: boolean;
};

function TextField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  type = "text",
  casing = "sentence",
  disabled,
  required = true,
}: FieldProps<TName> & { type?: string; casing?: Casing }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value as string}
              type={type}
              disabled={disabled}
              onChange={(e) =>
                field.onChange(applyCasing(e.target.value, casing))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PassportField({
  control,
  disabled,
  showLookup,
  isLookingUp,
  onLookup,
}: {
  control: Control<ReceptionFormValues>;
  disabled?: boolean;
  showLookup: boolean;
  isLookingUp: boolean;
  onLookup: () => void;
}) {
  return (
    <FormField
      control={control}
      name="passportNo"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Passport No. *</FormLabel>
          <FormControl>
            <div className="flex h-11 items-stretch rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring">
              <input
                {...field}
                value={field.value as string}
                disabled={disabled}
                onChange={(e) =>
                  field.onChange(applyCasing(e.target.value, "none"))
                }
                className={`flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${showLookup ? "rounded-l-md" : "rounded-md"}`}
              />
              {showLookup && (
                <button
                  type="button"
                  onClick={onLookup}
                  disabled={disabled || isLookingUp}
                  aria-label="Look up passport"
                  className="flex items-center justify-center rounded-r-md border-l border-input px-3 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLookingUp ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SearchIcon className="size-4" />
                  )}
                </button>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextAreaField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  casing = "sentence",
  disabled,
  required = true,
}: FieldProps<TName> & { casing?: Casing }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value as string}
              disabled={disabled}
              onChange={(e) =>
                field.onChange(applyCasing(e.target.value, casing))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DateField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  disabled,
  required = true,
}: FieldProps<TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <DatePicker
              value={field.value as string}
              onChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function PhoneField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  disabled,
  required = true,
}: FieldProps<TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {required && " *"}
          </FormLabel>
          <FormControl>
            <PhoneInput
              ref={field.ref}
              value={field.value as string}
              onChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  options,
  optionLabels,
  disabled,
}: FieldProps<TName> & {
  options: string[];
  optionLabels?: Record<string, string>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label} *</FormLabel>
          <Select
            value={field.value as string}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {optionLabels?.[option] ?? option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function YesNoField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  disabled,
}: FieldProps<TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label} *</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value ? "yes" : "no"}
              onValueChange={(v) => field.onChange(v === "yes")}
              disabled={disabled}
              className="flex flex-row gap-4"
            >
              <label
                htmlFor={`${name}-yes`}
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem value="yes" id={`${name}-yes`} /> Yes
              </label>
              <label
                htmlFor={`${name}-no`}
                className="flex items-center gap-2 text-sm"
              >
                <RadioGroupItem value="no" id={`${name}-no`} /> No
              </label>
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CheckboxField<TName extends FieldPath<ReceptionFormValues>>({
  control,
  name,
  label,
  disabled,
}: FieldProps<TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-row items-center gap-2">
          <FormControl>
            <Checkbox
              checked={field.value as boolean}
              onCheckedChange={field.onChange}
              disabled={disabled}
              id={field.name}
            />
          </FormControl>
          <FormLabel className="normal-case tracking-normal">{label}</FormLabel>
        </FormItem>
      )}
    />
  );
}
