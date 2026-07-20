"use client";

import { EyeIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DocType } from "@/lib/domain/types";
import type { Document } from "@/lib/services/document-service";

const DOCUMENT_LABELS: Record<DocType, string> = {
  passport_biodata: "Passport biodata page",
  valid_visa: "Valid visa",
  mincom_letter: "MINCOM letter of approval",
  work_residence_permit: "Work or residence permit",
  ghana_card: "Ghana Card",
  assignment_letter: "Letter of assignment / contract",
  insurance_proof: "Proof of medical/travel insurance",
  hospital_fitness_form: "Fitness form",
};

const RECEPTION_DOCUMENT_TYPES: DocType[] = [
  "passport_biodata",
  "valid_visa",
  "mincom_letter",
  "work_residence_permit",
  "ghana_card",
  "assignment_letter",
  "insurance_proof",
];

function fileNameFromUrl(blobUrl: string): string {
  try {
    const segments = new URL(blobUrl).pathname.split("/");
    return decodeURIComponent(segments[segments.length - 1] || "file");
  } catch {
    return "file";
  }
}

type DocumentSelectorProps = {
  engagementId?: string;
  mode?: "select" | "required";
  docTypes?: DocType[];
  value?: DocType[];
  onChange?: (value: DocType[]) => void;
  uploadedDocuments: Document[];
  pendingFiles?: Partial<Record<DocType, File>>;
  onPendingFilesChange?: (files: Partial<Record<DocType, File>>) => void;
  disabled?: boolean;
};

export function DocumentSelector({
  engagementId,
  mode = "select",
  docTypes = RECEPTION_DOCUMENT_TYPES,
  value = [],
  onChange,
  uploadedDocuments,
  pendingFiles = {},
  onPendingFilesChange,
  disabled,
}: DocumentSelectorProps) {
  function toggle(docType: DocType, checked: boolean) {
    onChange?.(
      checked ? [...value, docType] : value.filter((t) => t !== docType),
    );
  }

  function removePendingFile(docType: DocType) {
    const next = { ...pendingFiles };
    delete next[docType];
    onPendingFilesChange?.(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {docTypes.map((docType) => {
        const isApplicable = mode === "required" || value.includes(docType);
        const uploaded = uploadedDocuments.find(
          (doc) => doc.docType === docType,
        );
        return (
          <div
            key={docType}
            className="flex items-center justify-between gap-3"
          >
            {mode === "required" ? (
              <span className="text-sm text-foreground">
                {DOCUMENT_LABELS[docType]}
              </span>
            ) : (
              <label
                htmlFor={`applicable-${docType}`}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <Checkbox
                  id={`applicable-${docType}`}
                  checked={isApplicable}
                  onCheckedChange={(checked) =>
                    toggle(docType, checked === true)
                  }
                  disabled={disabled}
                />
                {DOCUMENT_LABELS[docType]}
              </label>
            )}
            {isApplicable &&
              (engagementId ? (
                <UploadSlot
                  engagementId={engagementId}
                  docType={docType}
                  uploaded={uploaded}
                  disabled={disabled}
                />
              ) : (
                <PendingUploadSlot
                  file={pendingFiles[docType]}
                  onSelect={(file) =>
                    onPendingFilesChange?.({ ...pendingFiles, [docType]: file })
                  }
                  onRemove={() => removePendingFile(docType)}
                  disabled={disabled}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function PendingUploadSlot({
  file,
  onSelect,
  onRemove,
  disabled,
}: {
  file: File | undefined;
  onSelect: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) onSelect(selected);
  }

  if (file) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => previewUrl && window.open(previewUrl, "_blank")}
          className="max-w-40 truncate text-sm text-primary underline hover:text-primary/80"
        >
          {file.name}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={disabled}
          onClick={() => previewUrl && window.open(previewUrl, "_blank")}
        >
          <EyeIcon />
          <span className="sr-only">View</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2Icon />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Choose file
      </Button>
      <span className="text-xs text-muted-foreground">Required</span>
    </div>
  );
}

function UploadSlot({
  engagementId,
  docType,
  uploaded,
  disabled,
}: {
  engagementId: string;
  docType: DocType;
  uploaded: Document | undefined;
  disabled?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("engagementId", engagementId);
      formData.set("docType", docType);
      formData.set("file", file);

      try {
        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();

        if (result.success) {
          toast.success(`${DOCUMENT_LABELS[docType]} uploaded`);
          router.refresh();
        } else {
          toast.error(result.error ?? "Upload failed");
        }
      } catch {
        toast.error("Upload failed");
      } finally {
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    });
  }

  async function handleView() {
    if (!uploaded) return;
    const response = await fetch(`/api/documents/${uploaded.id}`).catch(
      () => null,
    );
    if (!response?.ok) {
      toast.error("Couldn't load the document");
      return;
    }
    const { data } = await response.json();
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  function handleDelete() {
    if (!uploaded) return;
    const confirmed = window.confirm(
      `Remove ${fileNameFromUrl(uploaded.blobUrl)}? You'll need to upload it again if it's still required.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    fetch(`/api/documents/${uploaded.id}`, { method: "DELETE" })
      .then((response) => response.json())
      .then((result) => {
        setIsDeleting(false);
        if (result.success) {
          toast.success(`${DOCUMENT_LABELS[docType]} removed`);
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to remove document");
        }
      })
      .catch(() => {
        setIsDeleting(false);
        toast.error("Failed to remove document");
      });
  }

  if (uploaded) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleView}
          className="max-w-40 truncate text-sm text-primary underline hover:text-primary/80"
        >
          {fileNameFromUrl(uploaded.blobUrl)}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={disabled}
          onClick={handleView}
        >
          <EyeIcon />
          <span className="sr-only">View</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          loading={isDeleting}
          disabled={disabled}
          onClick={handleDelete}
        >
          <Trash2Icon />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={isPending}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Upload file
      </Button>
      <span className="text-xs text-muted-foreground">Required</span>
    </div>
  );
}
