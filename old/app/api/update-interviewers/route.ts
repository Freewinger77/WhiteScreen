import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";
import { VAPI_ASSISTANT_SYSTEM_PROMPT } from "@/lib/constants";
import { InterviewerService } from "@/services/interviewers.service";

const vapiClient = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export async function POST(req: Request) {
  logger.info("update-interviewers request received");

  try {
    // Get custom prompt from request body if provided
    const body = await req.json().catch(() => ({}));
    const customPrompt = body.prompt || VAPI_ASSISTANT_SYSTEM_PROMPT;

    // Get all existing interviewers from database
    const interviewers = await InterviewerService.getAllInterviewers();
    
    if (!interviewers || interviewers.length === 0) {
      return NextResponse.json(
        { error: "No interviewers found" },
        { status: 404 },
      );
    }

    const updatedAssistants = [];

    // Update each assistant (Vapi allows direct updates - much simpler than Retell!)
    for (const interviewer of interviewers) {
      try {
        // Vapi allows direct updates without creating new assistants
        const updatedAssistant = await vapiClient.assistants.update(
          interviewer.agent_id,
          {
            model: {
              messages: [
                {
                  role: "system",
                  content: customPrompt,
                },
              ],
            },
          }
        );

        updatedAssistants.push({
          name: interviewer.name,
          assistant_id: updatedAssistant.id,
          status: "updated",
        });

        logger.info(`Updated assistant for ${interviewer.name}: ${updatedAssistant.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to update assistant ${interviewer.name}:`, errorMessage);
        updatedAssistants.push({
          name: interviewer.name,
          assistant_id: interviewer.agent_id,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json(
      {
        message: "Interviewers update completed",
        results: updatedAssistants,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update interviewers";
    logger.error("Error updating interviewers:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

