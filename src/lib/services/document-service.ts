import { and, desc, eq, isNull } from "drizzle-orm";
import { deleteBlob, generateSasUrl, uploadBlob } from "@/lib/azure/blob";
import { db } from "@/lib/db/client";
import { documents, engagements, workflowCycles } from "@/lib/db/schema";
import type { DocType, ReceptionData } from "@/lib/domain/types";

export type Document = typeof documents.$inferSelect;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
