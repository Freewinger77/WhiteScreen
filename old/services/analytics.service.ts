"use server";

import { OpenAI } from "openai";
import { ResponseService } from "@/services/responses.service";
import { InterviewService } from "@/services/interviews.service";
import { CustomMetric, Question } from "@/types/interview";
import { Analytics } from "@/types/response";
import {
  getInterviewAnalyticsPrompt,
  SYSTEM_PROMPT,
} from "@/lib/prompts/analytics";

export const generateInterviewAnalytics = async (payload: {
  callId: string;
  interviewId: string;
  transcript: string;
  forceRegenerate?: boolean; // Force regeneration even if analytics exist
}) => {
  const { callId, interviewId, transcript, forceRegenerate = false } = payload;

  try {
    const response = await ResponseService.getResponseByCallId(callId);
    const interview = await InterviewService.getInterviewById(interviewId);

    // Skip returning cached analytics if force regenerate is requested
    if (response.analytics && !forceRegenerate) {
      return { analytics: response.analytics as Analytics, status: 200 };
    }

    let interviewTranscript = transcript || response.details?.transcript || "";
    
    // If candidate has attached CV (from interview flow), prepend it to the transcript for evaluation
    const attachedCv = response.details?.attached_cv;
    if (attachedCv?.text) {
      const cvTextLength = attachedCv.text.length;
      const cvSection = `
=== ATTACHED CV ===
${attachedCv.text}
=== END OF CV ===

=== INTERVIEW TRANSCRIPT ===
`;
      interviewTranscript = cvSection + interviewTranscript;
      console.log("[Analytics] Including attached CV in evaluation:", {
        cvFileName: attachedCv.fileName,
        cvTextLength: cvTextLength,
        totalContentLength: interviewTranscript.length
      });
    } else {
      console.log("[Analytics] No attached CV found for this response");
    }
    
    const questions = interview?.questions || [];
    const customMetrics: CustomMetric[] = interview?.custom_metrics || [];
    
    const mainInterviewQuestions = questions
      .map((q: Question, index: number) => `${index + 1}. ${q.question}`)
      .join("\n");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 5,
      dangerouslyAllowBrowser: true,
    });

    // Pass custom metrics to the prompt generator
    const prompt = getInterviewAnalyticsPrompt(
      interviewTranscript,
      mainInterviewQuestions,
      customMetrics.length > 0 ? customMetrics : undefined,
    );

    const baseCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const basePromptOutput = baseCompletion.choices[0] || {};
    const content = basePromptOutput.message?.content || "";
    const analyticsResponse = JSON.parse(content);

    analyticsResponse.mainInterviewQuestions = questions.map(
      (q: Question) => q.question,
    );

    // If custom metrics exist, ALWAYS calculate weighted overall score ourselves (don't trust LLM calculation)
    if (customMetrics.length > 0 && analyticsResponse.customMetrics) {
      const totalWeight = customMetrics.reduce((sum, m) => sum + m.weight, 0);
      
      if (totalWeight > 0) {
        let weightedSum = 0;
        for (const metricScore of analyticsResponse.customMetrics) {
          // score is 0-10, weight is the metric weight
          weightedSum += (metricScore.score * metricScore.weight);
        }
        // Weighted average: (sum of score*weight) / total_weight
        // This gives us a 0-10 score, then multiply by 10 for 0-100 display
        const weightedAverage = weightedSum / totalWeight;
        analyticsResponse.weightedOverallScore = Math.round(weightedAverage * 10);
        
        console.log("[Analytics] Weighted score calculation:", {
          metrics: analyticsResponse.customMetrics.map((m: any) => ({ title: m.title, score: m.score, weight: m.weight })),
          weightedSum,
          totalWeight,
          weightedAverage,
          finalScore: analyticsResponse.weightedOverallScore
        });
      }
    }

    return { analytics: analyticsResponse, status: 200 };
  } catch (error) {
    console.error("Error in OpenAI request:", error);

    return { error: "internal server error", status: 500 };
  }
};

// Re-evaluate all responses for an interview with updated custom metrics
export const reEvaluateInterviewResponses = async (interviewId: string) => {
  try {
    const responses = await ResponseService.getAllResponses(interviewId);
    const results: { callId: string; success: boolean; error?: string }[] = [];

    for (const response of responses) {
      if (!response.details?.transcript && !response.call_id) {
        results.push({ callId: response.call_id, success: false, error: "No transcript available" });
        continue;
      }

      try {
        const result = await generateInterviewAnalytics({
          callId: response.call_id,
          interviewId: interviewId,
          transcript: response.details?.transcript || "",
          forceRegenerate: true,
        });

        if (result.analytics) {
          await ResponseService.updateResponse(
            { analytics: result.analytics, is_analysed: true },
            response.call_id
          );
          results.push({ callId: response.call_id, success: true });
        } else {
          results.push({ callId: response.call_id, success: false, error: result.error });
        }
      } catch (error) {
        results.push({ callId: response.call_id, success: false, error: String(error) });
      }
    }

    return { results, status: 200 };
  } catch (error) {
    console.error("Error re-evaluating responses:", error);
    return { error: "Failed to re-evaluate responses", status: 500 };
  }
};
