import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { InterviewerService } from "@/services/interviewers.service";
import { logger } from "@/lib/logger";
import { VAPI_ASSISTANT_SYSTEM_PROMPT } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    logger.info("livekit-token request received");
    
    const body = await req.json();
    const {
      candidate_name,
      candidate_email,
      interview_id,
      interviewer_id,
      dynamic_data,
    } = body;

    if (!interviewer_id) {
      logger.error("Missing interviewer_id in request");
      return NextResponse.json(
        { error: "Interviewer ID is required" },
        { status: 400 },
      );
    }

    // Fetch interviewer from database
    logger.info(`Fetching interviewer with ID: ${interviewer_id}`);
    const interviewer = await InterviewerService.getInterviewer(interviewer_id);

    if (!interviewer) {
      logger.error(`Interviewer not found with ID: ${interviewer_id}`);
      return NextResponse.json(
        { error: `Interviewer not found with ID: ${interviewer_id}` },
        { status: 404 },
      );
    }

    // Generate unique room name
    const roomName = `interview-${interview_id}-${Date.now()}`;
    
    // Package ALL interview configuration for participant metadata
    const participantMetadata = {
      role: 'candidate',
      interview_id,
      candidate_name,
      candidate_email,
      interviewer_name: interviewer.name,
      voice_id: interviewer.voice_id || null,
      system_prompt: VAPI_ASSISTANT_SYSTEM_PROMPT,
      ...dynamic_data, // objective, job_context, questions, mins
    };

    logger.info(`📦 Packaging metadata with keys: ${Object.keys(participantMetadata).join(', ')}`);
    
    // 🔥 Create token with ALL data in participant metadata
    // Room will be auto-created when participant joins (agent dispatches THEN)
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity: candidate_email || `anonymous-${Date.now()}`,
        name: candidate_name,
        // ALL interview data goes here - agent will read this
        metadata: JSON.stringify(participantMetadata),
      }
    );

    // Grant permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    // Generate JWT token
    const token = await at.toJwt();

    logger.info(`✅ Generated LiveKit token for room: ${roomName}`);

    // Return token and room info
    return NextResponse.json({
      token,
      roomName,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    }, { status: 200 });

  } catch (error) {
    logger.error("Error in livekit-token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

