import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import Retell from "retell-sdk";
import { RETELL_AGENT_GENERAL_PROMPT } from "@/lib/constants";
import { InterviewerService } from "@/services/interviewers.service";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

export async function POST(req: Request) {
  logger.info("update-interviewers request received");

  try {
    // Get custom prompt from request body if provided
    const body = await req.json().catch(() => ({}));
    const customPrompt = body.prompt || RETELL_AGENT_GENERAL_PROMPT;

    // Get all existing interviewers from database
    const interviewers = await InterviewerService.getAllInterviewers();
    
    if (!interviewers || interviewers.length === 0) {
      return NextResponse.json(
        { error: "No interviewers found" },
        { status: 404 },
      );
    }

    // Create a new LLM with the updated prompt
    const newModel = await retellClient.llm.create({
      model: "gpt-4o",
      general_prompt: customPrompt,
      general_tools: [
        {
          type: "end_call",
          name: "end_call_1",
          description:
            "End the call if the user uses goodbye phrases such as 'bye,' 'goodbye,' or 'have a nice day.' ",
        },
      ],
    });

    logger.info(`Created new LLM model with ID: ${newModel.llm_id}`);

    const updatedAgents = [];

    // Create new agents for each interviewer (Retell doesn't allow updating response engine)
    for (const interviewer of interviewers) {
      try {
        // Get the existing agent details
        const existingAgent = await retellClient.agent.retrieve(interviewer.agent_id);
        
        // Create a NEW agent with the updated prompt
        const newAgent = await retellClient.agent.create({
          response_engine: { llm_id: newModel.llm_id, type: "retell-llm" },
          responsiveness: 0.8,
          voice_id: existingAgent.voice_id,
          enable_backchannel: false,
          agent_name: existingAgent.agent_name,
        });

        // Update the database with the new agent_id
        await InterviewerService.updateInterviewer(Number(interviewer.id), {
          agent_id: newAgent.agent_id,
        });

        updatedAgents.push({
          name: interviewer.name,
          old_agent_id: interviewer.agent_id,
          new_agent_id: newAgent.agent_id,
          status: "updated",
        });

        logger.info(`Created new agent for ${interviewer.name}: ${newAgent.agent_id} (old: ${interviewer.agent_id})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error(`Failed to update agent ${interviewer.name}:`, errorMessage);
        updatedAgents.push({
          name: interviewer.name,
          agent_id: interviewer.agent_id,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json(
      {
        message: "Interviewers update completed",
        llm_id: newModel.llm_id,
        results: updatedAgents,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update interviewers";
    logger.error("Error updating interviewers:", errorMessage);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update interviewers" },
      { status: 500 },
    );
  }
}

