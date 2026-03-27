import { logger } from "@/lib/logger";
import { generateInterviewAnalytics } from "@/services/analytics.service";
import { ResponseService } from "@/services/responses.service";
import { Response } from "@/types/response";
import { NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";
import { createClient } from "@supabase/supabase-js";

const vapiClient = new VapiClient({
  token: process.env.VAPI_API_KEY || "",
});

export const maxDuration = 59;

export async function POST(req: Request, res: Response) {
  logger.info("get-call request received");
  
  try {
    const body = await req.json();

    if (!body.id) {
      logger.error("Missing call ID in request");
      return NextResponse.json(
        { error: "Call ID is required" },
        { status: 400 },
      );
    }

    const callDetails: Response = await ResponseService.getResponseByCallId(
      body.id,
    );
    
    if (!callDetails) {
      logger.error(`Call not found in database: ${body.id}`);
      return NextResponse.json(
        { error: "Call not found in database" },
        { status: 404 },
      );
    }
    
    let callResponse = callDetails.details;
    
    if (callDetails.is_analysed) {
      // Recalculate weighted score on-the-fly to ensure it's always correct
      let analytics = callDetails.analytics;
      if (analytics?.customMetrics && analytics.customMetrics.length > 0) {
        const totalWeight = analytics.customMetrics.reduce((sum: number, m: any) => sum + (m.weight || 0), 0);
        if (totalWeight > 0) {
          let weightedSum = 0;
          for (const metric of analytics.customMetrics) {
            weightedSum += ((metric.score || 0) * (metric.weight || 0));
          }
          // Weighted average on 0-10 scale, then multiply by 10 for 0-100 display
          const weightedAverage = weightedSum / totalWeight;
          analytics.weightedOverallScore = Math.round(weightedAverage * 10);
          logger.info(`[get-call] Recalculated weighted score: ${analytics.weightedOverallScore} (sum=${weightedSum}, totalWeight=${totalWeight})`);
        }
      }
      return NextResponse.json(
        {
          callResponse,
          analytics,
        },
        { status: 200 },
      );
    }
    
    // Check if this is a LiveKit call by:
    // 1. Call ID format (starts with "interview-" = LiveKit room name)
    // 2. OR has LiveKit-specific fields in database
    const isLiveKitCall = body.id.startsWith('interview-') || 
                          callResponse?.recorded_video_url || 
                          callResponse?.livekit_room_name;
    
    // For LiveKit calls, skip Vapi fetch and use transcript from DB
    if (isLiveKitCall) {
      logger.info(`[get-call] Detected LiveKit call ${body.id}, skipping Vapi fetch`);
      
      // Auto-recover: if details is null/empty, check storage for orphaned recording
      if (!callResponse || (!callResponse.transcript && !callResponse.recording_url)) {
        logger.info(`[get-call] Attempting auto-recovery for ${body.id}`);
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const fileName = `${body.id}.webm`;
          const { data: fileCheck } = await supabase.storage
            .from('recordings')
            .list('', { search: fileName, limit: 1 });
          
          if (fileCheck && fileCheck.length > 0) {
            const { data: urlData } = supabase.storage
              .from('recordings')
              .getPublicUrl(fileName);
            
            logger.info(`[get-call] Found orphaned recording in storage: ${urlData.publicUrl}`);
            callResponse = {
              ...(callResponse || {}),
              livekit_room_name: body.id,
              recording_url: urlData.publicUrl,
              transcript: callResponse?.transcript || "",
            };
            
            await ResponseService.saveResponse(
              { details: callResponse },
              body.id,
            );
            logger.info(`[get-call] Auto-recovered recording URL for ${body.id}`);
          }
        } catch (recoveryErr) {
          logger.error(`[get-call] Auto-recovery failed for ${body.id}:`, recoveryErr);
        }
      }
      
      const transcript = callResponse?.transcript || "";
      
      if (!transcript) {
        logger.error(`No transcript found for LiveKit call ${body.id}`);
        return NextResponse.json(
          { error: "No transcript available for this call" },
          { status: 404 },
        );
      }
      
      const interviewId = callDetails?.interview_id;
      
      // Generate analytics from transcript
      const payload = {
        callId: body.id,
        interviewId: interviewId,
        transcript: transcript,
      };
      
      const result = await generateInterviewAnalytics(payload);

      if (result.error) {
        logger.error(
          `Failed to generate analytics for LiveKit call ${body.id}: ${result.error}`,
        );
        return NextResponse.json(
          {
            error: "Failed to generate call analytics",
            details: result.error,
          },
          { status: 500 },
        );
      }

      const analytics = result.analytics;

      // Calculate duration from existing data or use stored duration
      const duration = callDetails.duration || 0;

      await ResponseService.saveResponse(
        {
          details: callResponse,
          is_analysed: true,
          duration: duration,
          analytics: analytics,
        },
        body.id,
      );

      logger.info("LiveKit call analysed successfully");

      return NextResponse.json(
        {
          callResponse,
          analytics,
        },
        { status: 200 },
      );
    }
    
    // For Vapi calls, continue with original logic
    logger.info(`[get-call] Detected Vapi call ${body.id}, fetching from Vapi API`);
    
    // Retrieve call from Vapi with error handling
    let vapiCall;
    try {
      // Vapi SDK expects an object with 'id' property, not a raw string
      vapiCall = await vapiClient.calls.get({ id: body.id });
    } catch (error) {
      logger.error(`Failed to fetch call from Vapi API: ${body.id}`, error);
      return NextResponse.json(
        { 
          error: "Call not found in Vapi",
          details: error instanceof Error ? error.message : "Unknown error",
          callId: body.id,
        },
        { status: 404 },
      );
    }
    
    const interviewId = callDetails?.interview_id;
  
  // Transform Vapi response to match expected structure
  const startTime = vapiCall.startedAt ? new Date(vapiCall.startedAt).getTime() : Date.now();
  const endTime = vapiCall.endedAt ? new Date(vapiCall.endedAt).getTime() : Date.now();
  
  // Preserve any existing data in details (like attached_cv from interview flow)
  const existingDetails = callDetails.details || {};
  
  // Log if CV was attached during interview
  if (existingDetails.attached_cv) {
    logger.info(`[get-call] Found attached CV in existing details: ${existingDetails.attached_cv.fileName || 'unknown'}`);
  } else {
    logger.info(`[get-call] No attached CV found in existing details`);
  }
  
  callResponse = {
    // Preserve existing details (attached_cv, etc.)
    ...existingDetails,
    
    call_id: vapiCall.id,
    start_timestamp: startTime,
    end_timestamp: endTime,
    
    // Vapi provides transcript as array of messages or as a string
    transcript: vapiCall.transcript || 
      (vapiCall.messages?.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')) || "",
    
    // Recording URLs
    recording_url: vapiCall.recordingUrl,
    stereo_recording_url: vapiCall.stereoRecordingUrl,
    public_log_url: vapiCall.artifact?.transcript?.url || vapiCall.recordingUrl,
    
    // Call analysis from Vapi
    call_analysis: {
      call_summary: vapiCall.summary || vapiCall.analysis?.summary || "",
      user_sentiment: vapiCall.analysis?.sentiment || "neutral",
    },
    
    // Preserve other Vapi data
    ...vapiCall,
  };
  
  // Log if CV was attached
  if (existingDetails.attached_cv) {
    logger.info(`[get-call] Preserving attached CV for call ${body.id}`);
  }
  
  const duration = Math.round((endTime - startTime) / 1000);

  const payload = {
    callId: body.id,
    interviewId: interviewId,
    transcript: callResponse.transcript,
  };
  
  const result = await generateInterviewAnalytics(payload);

  if (result.error) {
    logger.error(
      `Failed to generate analytics for call ${body.id}: ${result.error}`,
    );
    return NextResponse.json(
      {
        error: "Failed to generate call analytics",
        details: result.error,
      },
      { status: 500 },
    );
  }

  const analytics = result.analytics;

  await ResponseService.saveResponse(
    {
      details: callResponse,
      is_analysed: true,
      duration: duration,
      analytics: analytics,
    },
    body.id,
  );

  logger.info("Call analysed successfully");

  return NextResponse.json(
    {
      callResponse,
      analytics,
    },
    { status: 200 },
  );
  } catch (error) {
    logger.error("Unexpected error in get-call:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
