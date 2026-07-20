import { type NextRequest, NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/auth/guards";
import type { DocType } from "@/lib/domain/types";
import {
  getDocTypeOwnerRole,
  uploadDocument,
} from "@/lib/services/document-service";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length"));
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { success: false, error: "File exceeds the 10MB upload limit" },
      { status: 413 },
    );
  }

  try {
    const formData = await req.formData();
    const engagementId = formData.get("engagementId");
    const docType = formData.get("docType");
    const file = formData.get("file");

    if (
      typeof engagementId !== "string" ||
      typeof docType !== "string" ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { success: false, error: "Missing engagementId, docType, or file" },
        { status: 400 },
      );
    }

    const ownerRole = getDocTypeOwnerRole(docType);
    if (!ownerRole) {
      return NextResponse.json(
        { success: false, error: "Invalid document type" },
        { status: 400 },
      );
    }

    let staffUserId: string;
    try {
      const session = await requireWriteAccess(ownerRole);
      staffUserId = session.staffUserId;
    } catch {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 },
      );
    }

    const document = await uploadDocument({
      engagementId,
      docType: docType as DocType,
      file,
      uploadedBy: staffUserId,
    });

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("[api/documents]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
