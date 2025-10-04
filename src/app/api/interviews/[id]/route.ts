import { NextResponse } from "next/server";
import { InterviewService } from "@/services/interviews.service";
import { uploadLogo, deleteLogo } from "@/services/storage.service";
import { getSupabaseStoragePathFromUrl } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const formData = await req.formData();
    const payloadRaw = formData.get("payload");

    if (typeof payloadRaw !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const payload = JSON.parse(payloadRaw);
    const logoFile = formData.get("logo");
    const existingLogoPath = formData.get("existingLogoPath");

    let logoUrl: string | null | undefined = payload.logo_url;

    if (logoFile instanceof File && logoFile.size > 0) {
      if (typeof existingLogoPath === "string" && existingLogoPath.length > 0) {
        try {
          await deleteLogo(existingLogoPath);
        } catch (error) {
          logger.error("Failed to delete existing logo", error as Error);
        }
      }

      const sanitizedName = payload.name?.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "logo";
      const storageKey = `interviews/${params.id}/${Date.now()}-${sanitizedName}`;
      logoUrl = await uploadLogo(logoFile, storageKey);
    }

    const { logo_file: _logoFile, ...restPayload } = payload;

    const updatePayload = {
      ...restPayload,
      logo_url: logoUrl ?? null,
    };

    await InterviewService.updateInterview(updatePayload, params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Failed to update interview", error as Error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await InterviewService.deleteInterview(params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Failed to delete interview", error as Error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
