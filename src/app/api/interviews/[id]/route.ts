import { NextResponse } from "next/server";
import { InterviewService } from "@/services/interviews.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const payload = await req.json();

    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Logo URL is now always from organization (Clerk), passed directly in payload
    const { logo_file: _logoFile, ...restPayload } = payload;

    const updatePayload = {
      ...restPayload,
      logo_url: payload.logo_url ?? null, // Use organization logo from payload
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
