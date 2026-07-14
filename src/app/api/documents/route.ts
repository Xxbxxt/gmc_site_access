import { type NextRequest, NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/auth/guards";
import type { DocType } from "@/lib/domain/types";
import { uploadDocument } from "@/lib/services/document-service";

export async function POST(req: NextRequest) {
  let staffUserId: string;
  try {
    const session = await requireWriteAccess("Receptionist");
    staffUserId = session.staffUserId;
  } catch {
    return NextResponse.json(
      { success: false, error: "Not authorized" },
      { status: 403 },
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
