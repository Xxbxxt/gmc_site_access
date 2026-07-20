import { NextResponse } from "next/server";

import { requirePinConfirmed, requireWriteAccess } from "@/lib/auth/guards";
import {
  deleteDocument,
  getDocTypeOwnerRole,
  getDocumentById,
  getDocumentViewUrl,
} from "@/lib/services/document-service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    await requirePinConfirmed();
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403 },
    );
  }

  try {
    const { documentId } = await params;
    const url = await getDocumentViewUrl(documentId);
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    console.error("[api/documents/:documentId]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    await requirePinConfirmed();
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403 },
    );
  }

  try {
    const { documentId } = await params;

    const document = await getDocumentById(documentId);
    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    const ownerRole = getDocTypeOwnerRole(document.docType);
    if (!ownerRole) {
      return NextResponse.json(
        { success: false, error: "Invalid document type" },
        { status: 400 },
      );
    }

    try {
      await requireWriteAccess(ownerRole);
    } catch {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 },
      );
    }

    await deleteDocument(documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/documents/:documentId DELETE]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
