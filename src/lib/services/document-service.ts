import { and, desc, eq, isNull } from "drizzle-orm";
import { deleteBlob, generateSasUrl, uploadBlob } from "@/lib/azure/blob";
import { db } from "@/lib/db/client";
import { documents, engagements, workflowCycles } from "@/lib/db/schema";
import type { DocType, ReceptionData, WorkflowRole } from "@/lib/domain/types";

export type Document = typeof documents.$inferSelect;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Single source of truth for which workflow role owns each doc type — the
// API route uses this to authorize uploads/deletes instead of hardcoding a
// role, so a new layer's doc type (e.g. Slice 4's induction forms) only
// needs an entry here, not a change to the route itself.
const DOC_TYPE_OWNERS: Record<DocType, WorkflowRole> = {
  passport_biodata: "Receptionist",
  valid_visa: "Receptionist",
  mincom_letter: "Receptionist",
  work_residence_permit: "Receptionist",
  ghana_card: "Receptionist",
  assignment_letter: "Receptionist",
  insurance_proof: "Receptionist",
  hospital_fitness_form: "HospitalStaff",
};

export function getDocTypeOwnerRole(docType: string): WorkflowRole | undefined {
  return (DOC_TYPE_OWNERS as Record<string, WorkflowRole>)[docType];
}

export type UploadDocumentInput = {
  engagementId: string;
  docType: DocType;
  file: File;
  uploadedBy: string;
};

export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<Document> {
  if (input.file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds the 10MB upload limit");
  }
  if (!ALLOWED_MIME_TYPES.has(input.file.type)) {
    throw new Error("Unsupported file type — upload a PDF, JPG, PNG, or WEBP");
  }

  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, input.engagementId));
  if (!engagement) {
    throw new Error("Engagement not found");
  }

  const [cycle] = await db
    .select()
    .from(workflowCycles)
    .where(
      and(
        eq(workflowCycles.engagementId, input.engagementId),
        isNull(workflowCycles.archivedAt),
      ),
    )
    .orderBy(desc(workflowCycles.cycleNumber))
    .limit(1);

  const blobUrl = await uploadBlob({
    engagementId: input.engagementId,
    docType: input.docType,
    file: input.file,
  });

  const [document] = await db
    .insert(documents)
    .values({
      engagementId: input.engagementId,
      workflowCycleId: cycle?.id,
      docType: input.docType,
      blobUrl,
      uploadedBy: input.uploadedBy,
    })
    .returning();

  return document;
}

export async function getDocumentsForEngagement(
  engagementId: string,
): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.engagementId, engagementId));
}

export async function getDocumentById(
  documentId: string,
): Promise<Document | undefined> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  return document;
}

export async function getDocumentViewUrl(documentId: string): Promise<string> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!document) {
    throw new Error("Document not found");
  }
  return generateSasUrl(document.blobUrl);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!document) {
    throw new Error("Document not found");
  }

  await db.delete(documents).where(eq(documents.id, documentId));
  await deleteBlob(document.blobUrl);
}

export async function getMissingRequiredDocTypes(
  engagementId: string,
): Promise<DocType[]> {
  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId));
  if (!engagement) {
    throw new Error("Engagement not found");
  }

  const receptionData = engagement.receptionData as ReceptionData;
  const applicable = receptionData.applicableDocuments ?? [];
  if (applicable.length === 0) {
    return [];
  }

  const uploaded = await getDocumentsForEngagement(engagementId);
  const uploadedTypes = new Set(uploaded.map((doc) => doc.docType));

  return applicable.filter((docType) => !uploadedTypes.has(docType));
}
