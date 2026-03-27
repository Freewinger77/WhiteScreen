import { logger } from "@/lib/logger";
import { InterviewerService } from "@/services/interviewers.service";
import { NextResponse, NextRequest } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";
import { INTERVIEWERS, VAPI_ASSISTANT_SYSTEM_PROMPT } from "@/lib/constants";

const vapiClient = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export async function GET(res: NextRequest) {
  logger.info("create-interviewer request received");

  try {
    // Create Lisa Assistant (Vapi combines LLM + Agent into one Assistant)
    const lisaAssistant = await vapiClient.assistants.create({
      name: INTERVIEWERS.LISA.name,
      
      // Model configuration - Azure OpenAI
      model: {
        provider: "azure-openai" as any,  // TypeScript types are outdated, but runtime supports it
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
        temperature: 0.7,  // Faster, more focused responses
        messages: [
          {
            role: "system",
            content: VAPI_ASSISTANT_SYSTEM_PROMPT,
          },
        ],
      },
      
      // Voice configuration - Azure TTS
      voice: {
        provider: "azure" as const,
        voiceId: INTERVIEWERS.LISA.voiceId,  // en-US-JennyNeural
      },
      
      // Static first message for instant call start (no LLM delay)
      firstMessage: "Hello! Thanks so much for joining me today. How are you doing?",
      firstMessageMode: "assistant-speaks-first",
      
      // Transcription settings - Azure STT
      transcriber: {
        provider: "azure",
        language: "en-US",
      } as any,  // TypeScript types are outdated, but runtime supports it
      
      // Call behavior (matches original Retell end_call tool)
      endCallPhrases: ["goodbye", "bye", "have a nice day", "thank you bye"],
      maxDurationSeconds: 3600,
      
      // Backchannel disabled (matches original Retell setting)
      backgroundSound: "off",
      
      // Controls how long assistant waits before speaking (prevents interrupting)
      startSpeakingPlan: {
        waitSeconds: 1,  // Give user time to think (vs Retell's 0.4s)
      },
      
      // Controls when assistant stops talking if user starts speaking
      stopSpeakingPlan: {
        numWords: 2,  // Stop if user says 2+ words
        voiceSeconds: 0.5,  // Detect user voice for 0.5s before stopping
        backoffSeconds: 1,  // Wait 1s before starting again
      },
    });

    const newInterviewer = await InterviewerService.createInterviewer({
      agent_id: lisaAssistant.id,
      name: INTERVIEWERS.LISA.name,
      description: INTERVIEWERS.LISA.description,
      image: INTERVIEWERS.LISA.image,
      audio: INTERVIEWERS.LISA.audio,
      empathy: INTERVIEWERS.LISA.empathy,
      exploration: INTERVIEWERS.LISA.exploration,
      rapport: INTERVIEWERS.LISA.rapport,
      speed: INTERVIEWERS.LISA.speed,
    });

    // Create Bob Assistant
    const bobAssistant = await vapiClient.assistants.create({
      name: INTERVIEWERS.BOB.name,
      
      // Model configuration - Azure OpenAI
      model: {
        provider: "azure-openai" as any,  // TypeScript types are outdated, but runtime supports it
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o",
        temperature: 0.7,  // Faster, more focused responses
        messages: [
          {
            role: "system",
            content: VAPI_ASSISTANT_SYSTEM_PROMPT,
          },
        ],
      },
      
      // Voice configuration - Azure TTS
      voice: {
        provider: "azure" as const,
        voiceId: INTERVIEWERS.BOB.voiceId,  // en-US-GuyNeural
      },
      
      // Static first message for instant call start (no LLM delay)
      firstMessage: "Hi there! Thanks for taking the time to chat with me today. How's everything going?",
      firstMessageMode: "assistant-speaks-first",
      
      // Transcription settings - Azure STT
      transcriber: {
        provider: "azure",
        language: "en-US",
      } as any,  // TypeScript types are outdated, but runtime supports it
      
      endCallPhrases: ["goodbye", "bye", "have a nice day", "thank you bye"],
      maxDurationSeconds: 3600,
      
      // Backchannel disabled (matches original Retell setting)
      backgroundSound: "off",
      
      // Controls how long assistant waits before speaking (prevents interrupting)
      startSpeakingPlan: {
        waitSeconds: 1,  // Give user time to think (vs Retell's 0.4s)
      },
      
      // Controls when assistant stops talking if user starts speaking
      stopSpeakingPlan: {
        numWords: 2,  // Stop if user says 2+ words
        voiceSeconds: 0.5,  // Detect user voice for 0.5s before stopping
        backoffSeconds: 1,  // Wait 1s before starting again
      },
    });

    const newSecondInterviewer = await InterviewerService.createInterviewer({
      agent_id: bobAssistant.id,
      name: INTERVIEWERS.BOB.name,
      description: INTERVIEWERS.BOB.description,
      image: INTERVIEWERS.BOB.image,
      audio: INTERVIEWERS.BOB.audio,
      empathy: INTERVIEWERS.BOB.empathy,
      exploration: INTERVIEWERS.BOB.exploration,
      rapport: INTERVIEWERS.BOB.rapport,
      speed: INTERVIEWERS.BOB.speed,
    });

    logger.info("Vapi assistants created successfully");

    return NextResponse.json(
      {
        newInterviewer,
        newSecondInterviewer,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error creating interviewers:", error instanceof Error ? error : String(error));

    return NextResponse.json(
      { error: "Failed to create interviewers" },
      { status: 500 },
    );
  }
}
