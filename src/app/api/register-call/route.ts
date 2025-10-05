import { logger } from "@/lib/logger";
import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse } from "next/server";
import Retell from "retell-sdk";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
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
        { error: "Interviewer has no agent configured" },
        { status: 500 },
      );
    }

    logger.info(`Creating web call for agent: ${interviewer.agent_id}`);
    const registerCallResponse = await retellClient.call.createWebCall({
      agent_id: interviewer.agent_id,
      retell_llm_dynamic_variables: body.dynamic_data,
    });

    logger.info("Call registered successfully");

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
