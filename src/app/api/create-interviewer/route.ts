import { logger } from "@/lib/logger";
import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse, NextRequest } from "next/server";
import Retell from "retell-sdk";
import { INTERVIEWERS, RETELL_AGENT_GENERAL_PROMPT } from "@/lib/constants";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

export async function GET(res: NextRequest) {
  logger.info("create-interviewer request received");

  try {
    const newModel = await retellClient.llm.create({
      model: "gpt-4o",
      general_prompt: RETELL_AGENT_GENERAL_PROMPT,
      general_tools: [
        {
          type: "end_call",
          name: "end_call_1",
          description:
            "ユーザーが「さようなら」、「ありがとうございました」、「良い一日を」などの別れのフレーズを使用した場合に通話を終了します。(End the call if the user uses goodbye phrases such as 'さようなら,' 'ありがとうございました,' or 'よい一日を.')",
        },
      ],
    });

    // Create Kaori (Female Japanese)
    const newFirstAgent = await retellClient.agent.create({
      response_engine: { llm_id: newModel.llm_id, type: "retell-llm" },
      responsiveness: 0.8,
      voice_id: "custom_voice_b1cb3cc263daeba837eacc2706",
      voice_speed: 0.85,
      language: "ja-JP",
      enable_backchannel: false,
      agent_name: "Kaori",
    });

    const newInterviewer = await InterviewerService.createInterviewer({
      agent_id: newFirstAgent.agent_id,
      ...INTERVIEWERS.LISA,
      name: "Kaori",
    });

    // Create Hideki (Male Japanese)
    const newSecondAgent = await retellClient.agent.create({
      response_engine: { llm_id: newModel.llm_id, type: "retell-llm" },
      responsiveness: 0.8,
      voice_id: "custom_voice_7ea6ce44c489d0c27a241c29bf",
      voice_speed: 0.85,
      language: "ja-JP",
      enable_backchannel: false,
      agent_name: "Hideki",
    });

    const newSecondInterviewer = await InterviewerService.createInterviewer({
      agent_id: newSecondAgent.agent_id,
      ...INTERVIEWERS.BOB,
      name: "Hideki",
    });

    logger.info("");

    return NextResponse.json(
      {
        newInterviewer,
        newSecondInterviewer,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error creating interviewers:");

    return NextResponse.json(
      { error: "Failed to create interviewers" },
      { status: 500 },
    );
  }
}
