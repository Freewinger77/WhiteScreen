import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { CV_ANALYSIS_SYSTEM_PROMPT, getCVAnalysisPrompt } from "@/lib/prompts/cv-analysis";
import { InterviewService } from "@/services/interviews.service";
import { logger } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";

/**
 * Recursively sanitize an object to remove problematic characters from all strings
 */
function sanitizeForDatabase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === "string") {
    return obj
      .replace(/\0/g, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
      .replace(/[\uD800-\uDFFF]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "");
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForDatabase);
  }
  
  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      sanitized[key] = sanitizeForDatabase(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

export const runtime = "nodejs";
export const maxDuration = 300; // Allow up to 5 minutes for re-processing multiple CVs

// Server-side Supabase client
const getServerSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
};

interface ReanalyzeResult {
  callId: string;
  oldName: string;
  newName: string;
  success: boolean;
  error?: string;
}

export async function POST(req: Request) {
  try {
    const { interviewId, responseIds } = await req.json();

    if (!interviewId) {
      return NextResponse.json(
        { error: "Interview ID is required" },
        { status: 400 }
      );
    }

    // Fetch interview details
    const interview = await InterviewService.getInterviewById(interviewId);
    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 }
      );
    }

    const supabase = getServerSupabase();

    // Fetch CV responses for this interview
    let query = supabase
      .from("response")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("is_ended", true);

    // If specific response IDs provided, filter by them
    if (responseIds && responseIds.length > 0) {
      query = query.in("call_id", responseIds);
    }

    const { data: responses, error: fetchError } = await query;

    if (fetchError) {
      logger.error("Error fetching responses:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: 500 }
      );
    }

    // Filter only CV uploads
    const cvResponses = responses?.filter(
      (r: any) => r.details?.source === "cv_upload"
    ) || [];

    if (cvResponses.length === 0) {
      return NextResponse.json(
        { error: "No CV responses found to re-analyze" },
        { status: 404 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
    });

    const results: ReanalyzeResult[] = [];

    for (const response of cvResponses) {
      try {
        const cvText = response.details?.cvText;
        
        if (!cvText) {
          results.push({
            callId: response.call_id,
            oldName: response.name,
            newName: response.name,
            success: false,
            error: "No CV text found in response",
          });
          continue;
        }

        logger.info(`Re-analyzing CV for: ${response.name} (${response.call_id})`);

        // Generate new analysis using OpenAI
        const prompt = getCVAnalysisPrompt(
          cvText,
          interview.objective,
          interview.job_context,
          interview.custom_metrics || []
        );

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: CV_ANALYSIS_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        });

        const analysisContent = completion.choices[0]?.message?.content;

        if (!analysisContent) {
          results.push({
            callId: response.call_id,
            oldName: response.name,
            newName: response.name,
            success: false,
            error: "Failed to generate analysis",
          });
          continue;
        }

        const analytics = JSON.parse(analysisContent);

        // Extract the candidate name from AI
        const newCandidateName = analytics.candidateName || response.name;
        const newCandidateEmail = analytics.candidateEmail || response.email;

        // Map CV analytics
        const mappedAnalytics = {
          overallScore: analytics.overallScore,
          overallFeedback: analytics.overallFeedback,
          communication: analytics.skills || { score: 0, feedback: "N/A - CV Analysis" },
          softSkillSummary: analytics.experienceSummary,
          questionSummaries: [],
          customMetrics: analytics.customMetrics,
          weightedOverallScore: analytics.weightedOverallScore,
          cvAnalysis: {
            yearsOfExperience: analytics.yearsOfExperience,
            keySkills: analytics.keySkills,
            education: analytics.education,
            skills: analytics.skills,
            cvAnalysisDisplay: analytics.cvAnalysisDisplay,
          },
        };

        // Update the response in the database (sanitize to prevent Unicode issues)
        const updatePayload = sanitizeForDatabase({
          name: newCandidateName,
          email: newCandidateEmail,
          analytics: mappedAnalytics,
          details: {
            ...response.details,
            extractedInfo: {
              ...response.details?.extractedInfo,
              name: newCandidateName,
              email: newCandidateEmail,
              phone: analytics.candidatePhone || response.details?.extractedInfo?.phone,
            },
          },
        });
        
        const { error: updateError } = await supabase
          .from("response")
          .update(updatePayload)
          .eq("call_id", response.call_id);

        if (updateError) {
          logger.error(`Error updating response ${response.call_id}:`, updateError);
          results.push({
            callId: response.call_id,
            oldName: response.name,
            newName: newCandidateName,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        results.push({
          callId: response.call_id,
          oldName: response.name,
          newName: newCandidateName,
          success: true,
        });

        logger.info(`Successfully re-analyzed CV: ${response.name} -> ${newCandidateName}`);
      } catch (cvError) {
        logger.error(`Error re-analyzing CV ${response.call_id}:`, cvError as Error);
        results.push({
          callId: response.call_id,
          oldName: response.name,
          newName: response.name,
          success: false,
          error: cvError instanceof Error ? cvError.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        success: true,
        message: `Re-analyzed ${successCount} CV(s) successfully${failCount > 0 ? `, ${failCount} failed` : ""}`,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in CV re-analysis:", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

