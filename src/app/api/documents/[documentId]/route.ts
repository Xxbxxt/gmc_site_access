import { NextResponse } from "next/server";

import { requirePinConfirmed, requireWriteAccess } from "@/lib/auth/guards";
import {
  deleteDocument,
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
    await requireWriteAccess("Receptionist");
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403 },
    );
  }

  try {
    const { documentId } = await params;
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
