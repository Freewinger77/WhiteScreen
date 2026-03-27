import { logger } from "@/lib/logger";
import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

const vapiClient = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export async function POST(req: Request, res: Response) {
  try {
    logger.info("register-call request received");

    const body = await req.json();

    const interviewerId = body.interviewer_id;
    
    if (!interviewerId) {
      logger.error("Missing interviewer_id in request");
      return NextResponse.json(
        { error: "Interviewer ID is required" },
        { status: 400 },
      );
    }

    logger.info(`Fetching interviewer with ID: ${interviewerId}`);
    const interviewer = await InterviewerService.getInterviewer(interviewerId);

    if (!interviewer) {
      logger.error(`Interviewer not found with ID: ${interviewerId}`);
      return NextResponse.json(
        { error: `Interviewer not found with ID: ${interviewerId}` },
        { status: 404 },
      );
    }

    if (!interviewer.agent_id) {
      logger.error(`Interviewer ${interviewerId} has no agent_id`);
      return NextResponse.json(
        { error: "Interviewer has no assistant configured" },
        { status: 500 },
      );
    }

    logger.info(`Preparing Vapi call for assistant: ${interviewer.agent_id}`);
    
    // For Vapi web calls, the frontend vapi.start() creates the call
    // We just need to pass the assistant ID and override data
    // Generate a temporary call ID for tracking
    const tempCallId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info("Returning assistant configuration for frontend");

    // Format response to match frontend expectations
    // access_token is actually the assistant ID for Vapi web calls
    const registerCallResponse = {
      call_id: tempCallId,
      access_token: interviewer.agent_id, // Frontend will use this as assistant ID
      // Include dynamic data for frontend to pass as assistantOverrides
      dynamic_data: {
        name: body.dynamic_data?.name || "",
        mins: body.dynamic_data?.mins || "",
        objective: body.dynamic_data?.objective || "",
        job_context: body.dynamic_data?.job_context || "",
        questions: body.dynamic_data?.questions || "",
      },
    };

    return NextResponse.json(
      {
        registerCallResponse,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error in register-call:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
