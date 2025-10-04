import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { InterviewService } from "@/services/interviews.service";
import { logger } from "@/lib/logger";
import { uploadLogo } from "@/services/storage.service";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

const base_url = process.env.NEXT_PUBLIC_LIVE_URL;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const interviewDataRaw = formData.get("interviewData");

    if (typeof interviewDataRaw !== "string") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      );
    }

    const payload = JSON.parse(interviewDataRaw);
    const logoFile = formData.get("logo");
    const organizationName = req.headers.get("x-organization-name") || null;

    logger.info("create-interview request received");

    const url_id = nanoid();
    const url = `${base_url}/call/${url_id}`;

    let logoUrl: string | null = payload.logo_url ?? null;

    if (logoFile instanceof File && logoFile.size > 0) {
      const safeName = slugify(logoFile.name) || `logo-${Date.now()}`;
      const storageKey = `interviews/${url_id}/${Date.now()}-${safeName}`;
      logoUrl = await uploadLogo(logoFile, storageKey);
    }

    const interviewNameSlug = slugify(payload.name);
    const orgNameSlug = slugify(organizationName);
    const readableSlug =
      interviewNameSlug && orgNameSlug
        ? `${orgNameSlug}-${interviewNameSlug}`
        : null;

    const interviewPayload = {
      ...payload,
      id: url_id,
      url,
      readable_slug: readableSlug,
      logo_url: logoUrl,
      interviewer_id: Number(payload.interviewer_id),
      response_count: Number(payload.response_count) || 0,
      question_count: Number(payload.question_count) || payload.questions?.length || 0,
      time_duration: String(payload.time_duration ?? ""),
      is_anonymous: Boolean(payload.is_anonymous),
    };

    const newInterview = await InterviewService.createInterview(
      interviewPayload,
    );

    logger.info("Interview created successfully");

    return NextResponse.json({ data: newInterview }, { status: 200 });
  } catch (err) {
    logger.error("Error creating interview", err as Error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
