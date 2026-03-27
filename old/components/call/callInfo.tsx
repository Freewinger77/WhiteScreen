"use client";

import React, { useEffect, useState } from "react";
import { Analytics, CallData, CustomMetricScore } from "@/types/response";
import axios from "axios";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import ReactAudioPlayer from "react-audio-player";
import { DownloadIcon, TrashIcon, FileText, Scale, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ResponseService } from "@/services/responses.service";
import { useRouter } from "next/navigation";
import LoaderWithText from "@/components/loaders/loader-with-text/loaderWithText";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@nextui-org/react";
import QuestionAnswerCard from "@/components/dashboard/interview/questionAnswerCard";
import { marked } from "marked";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { CandidateStatus } from "@/lib/enum";
import { ArrowLeft } from "lucide-react";
import { generateIndividualCandidatePDF } from "@/lib/pdf-generator";
import { useInterviews } from "@/contexts/interviews.context";

type CallProps = {
  call_id: string;
  onDeleteResponse: (deletedCallId: string) => void;
  onCandidateStatusChange: (callId: string, newStatus: string) => void;
};

function CallInfo({
  call_id,
  onDeleteResponse,
  onCandidateStatusChange,
}: CallProps) {
  const [call, setCall] = useState<CallData>();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [candidateStatus, setCandidateStatus] = useState<string>("");
  const [interviewId, setInterviewId] = useState<string>("");
  const [tabSwitchCount, setTabSwitchCount] = useState<number>();
  const [tabSwitchEvents, setTabSwitchEvents] = useState<Array<{ timestamp: number; duration: number }>>([]);
  const [isCVUpload, setIsCVUpload] = useState<boolean>(false);
  const [cvFileName, setCvFileName] = useState<string>("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [hasAttachedCV, setHasAttachedCV] = useState<boolean>(false);
  const { getInterviewById } = useInterviews();

  useEffect(() => {
    const fetchResponses = async () => {
      setIsLoading(true);
      setCall(undefined);
      setEmail("");
      setName("");

      try {
        const response = await axios.post("/api/get-call", { id: call_id });
        console.log("[CallInfo] get-call response:", {
          hasCallResponse: !!response.data.callResponse,
          hasAttachedCv: !!response.data.callResponse?.attached_cv,
          attachedCvFileName: response.data.callResponse?.attached_cv?.fileName
        });
        setCall(response.data.callResponse);
        setAnalytics(response.data.analytics);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call_id]);

  useEffect(() => {
    const fetchEmail = async () => {
      setIsLoading(true);
      try {
        const response = await ResponseService.getResponseByCallId(call_id);
        setEmail(response.email);
        setName(response.name);
        setCandidateStatus(response.candidate_status);
        setInterviewId(response.interview_id);
        setTabSwitchCount(response.tab_switch_count);
        setTabSwitchEvents(response.tab_switch_events || []);
        
        // Check if this is a CV upload or interview with attached CV
        if (response.details?.source === "cv_upload") {
          setIsCVUpload(true);
          setCvFileName(response.details.fileName || "");
          setCvUrl(response.cv_url || null); // Also get CV URL for CV-only uploads
          setHasAttachedCV(false);
        } else {
          setIsCVUpload(false);
          // Check for attached CV in interview response (stored in details.attached_cv)
          const attachedCv = response.details?.attached_cv;
          console.log("[CallInfo] Checking for attached CV:", { 
            hasAttachedCv: !!attachedCv,
            hasText: !!attachedCv?.text,
            fileName: attachedCv?.fileName
          });
          if (attachedCv?.text) {
            setHasAttachedCV(true);
            setCvUrl(attachedCv.url || null);
            setCvFileName(attachedCv.fileName || "");
          } else {
            setHasAttachedCV(false);
            setCvUrl(null);
            setCvFileName("");
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call_id]);

  useEffect(() => {
    const replaceAgentAndUser = (transcript: string, name: string): string => {
      const agentReplacement = "**AI interviewer:**";
      const userReplacement = `**${name}:**`;

      // Replace "Agent:" with "AI interviewer:" and "User:" with the variable `${name}:`
      let updatedTranscript = transcript
        .replace(/Agent:/g, agentReplacement)
        .replace(/User:/g, userReplacement);

      // Add space between the dialogues
      updatedTranscript = updatedTranscript.replace(/(?:\r\n|\r|\n)/g, "\n\n");

      return updatedTranscript;
    };

    if (call && call.transcript) {
      setTranscript(replaceAgentAndUser(call.transcript as string, name || "Candidate"));
    } else if (call && !call.transcript && call?.details?.source !== "cv_upload") {
      // Interview without transcript - show placeholder
      setTranscript("*No transcript available for this interview.*");
    } else if (call?.details?.source === "cv_upload") {
      // For CV uploads, show formatted CV analysis instead of raw text
      const cvAnalysisDisplay = (analytics as any)?.cvAnalysis?.cvAnalysisDisplay;
      
      if (cvAnalysisDisplay) {
        // Build formatted analysis display
        let formattedAnalysis = `## 📋 CV Analysis\n\n`;
        
        // Profile Summary
        if (cvAnalysisDisplay.profileSummary) {
          formattedAnalysis += `### Profile Summary\n${cvAnalysisDisplay.profileSummary}\n\n`;
        }
        
        // Work History
        if (cvAnalysisDisplay.workHistory?.length > 0) {
          formattedAnalysis += `### 💼 Work Experience\n`;
          cvAnalysisDisplay.workHistory.forEach((job: any) => {
            formattedAnalysis += `**${job.role}** at *${job.company}*\n`;
            if (job.duration) formattedAnalysis += `📅 ${job.duration}\n`;
            if (job.highlights?.length > 0) {
              job.highlights.forEach((h: string) => {
                formattedAnalysis += `- ${h}\n`;
              });
            }
            formattedAnalysis += `\n`;
          });
        }
        
        // Education
        if (cvAnalysisDisplay.educationDetails?.length > 0) {
          formattedAnalysis += `### 🎓 Education\n`;
          cvAnalysisDisplay.educationDetails.forEach((edu: any) => {
            formattedAnalysis += `**${edu.degree}** - ${edu.institution}`;
            if (edu.year) formattedAnalysis += ` (${edu.year})`;
            formattedAnalysis += `\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        // Technical Skills
        if (cvAnalysisDisplay.technicalSkills?.length > 0) {
          formattedAnalysis += `### 🛠️ Technical Skills\n`;
          cvAnalysisDisplay.technicalSkills.forEach((category: any) => {
            formattedAnalysis += `**${category.category}:** ${category.skills?.join(", ") || "N/A"}\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        // Achievements
        if (cvAnalysisDisplay.achievements?.length > 0) {
          formattedAnalysis += `### 🏆 Key Achievements\n`;
          cvAnalysisDisplay.achievements.forEach((a: string) => {
            formattedAnalysis += `- ${a}\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        // Strengths
        if (cvAnalysisDisplay.strengths?.length > 0) {
          formattedAnalysis += `### ✅ Strengths\n`;
          cvAnalysisDisplay.strengths.forEach((s: string) => {
            formattedAnalysis += `- ${s}\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        // Areas of Concern
        if (cvAnalysisDisplay.areasOfConcern?.length > 0) {
          formattedAnalysis += `### ⚠️ Areas to Explore\n`;
          cvAnalysisDisplay.areasOfConcern.forEach((c: string) => {
            formattedAnalysis += `- ${c}\n`;
          });
        }
        
        setTranscript(formattedAnalysis);
      } else {
        // Fallback to experience summary if no detailed analysis
        const experienceSummary = analytics?.softSkillSummary || "No analysis available";
        setTranscript(`## CV Analysis\n\n${experienceSummary}`);
      }
    }
  }, [call, name, analytics]);

  const onDeleteResponseClick = async () => {
    try {
      const response = await ResponseService.getResponseByCallId(call_id);

      if (response) {
        const interview_id = response.interview_id;

        await ResponseService.deleteResponse(call_id);

        router.push(`/interviews/${interview_id}`);

        onDeleteResponse(call_id);
      }

      toast.success("Response deleted successfully.", {
        position: "bottom-right",

        duration: 3000,
      });
    } catch (error) {
      console.error("Error deleting response:", error);

      toast.error("Failed to delete the response.", {
        position: "bottom-right",

        duration: 3000,
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const interview = await getInterviewById(interviewId);
      await generateIndividualCandidatePDF(
        name,
        email,
        analytics,
        call || null,
        interview?.name || "Interview",
        call?.recording_url,
        call?.public_log_url
      );
      toast.success("PDF downloaded successfully!", {
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF.", {
        position: "bottom-right",
        duration: 3000,
      });
    }
  };

  return (
    <div className="h-screen z-[10] mx-2 mb-[100px] overflow-y-scroll">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-[75%] w-full animate-fadeIn">
          <LoaderWithText text="Loading candidate..." />
        </div>
      ) : (
        <div className="animate-fadeIn">
          <div className="bg-slate-200 rounded-2xl min-h-[120px] p-4 px-5 y-3">
            <div className="flex flex-col justify-between bt-2">
              {/* <p className="font-semibold my-2 ml-2">
                Response Analysis and Insights
              </p> */}
              <div>
                <div className="flex justify-between items-center pb-4 pr-2">
                  <div
                    className=" inline-flex items-center text-indigo-600 hover:cursor-pointer"
                    onClick={() => {
                      router.push(`/interviews/${interviewId}`);
                    }}
                  >
                    <ArrowLeft className="mr-2" />
                    <p className="text-sm font-semibold">Back to Summary</p>
                  </div>
                  {tabSwitchCount !== undefined && tabSwitchCount !== null && tabSwitchCount > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-100 border border-red-200 rounded-md px-2.5 py-1 cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/>
                              <line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            Tab Switch ({tabSwitchCount}x)
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          className="bg-gray-800 text-white max-w-sm p-3"
                        >
                          <p className="font-semibold mb-2">⚠️ Tab Switching Detected</p>
                          <p className="text-sm text-gray-300 mb-2">
                            {tabSwitchCount} tab switch{tabSwitchCount > 1 ? 'es' : ''} during the interview.
                          </p>
                          {tabSwitchEvents.length > 0 && (
                            <div className="border-t border-gray-600 pt-2 mt-2">
                              <p className="text-xs text-gray-400 mb-1.5 font-medium">Timestamps:</p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {tabSwitchEvents.map((event, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-gray-300">
                                      #{idx + 1} - {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                    <span className="text-gray-400">
                                      ({Math.round(event.duration / 1000)}s away)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-600">
                            Tracked only during active call
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-between gap-3 w-full">
                <div className="flex flex-row justify-between">
                  <div className="flex flex-row gap-3">
                    <Avatar>
                      <AvatarFallback>{name ? name[0] : "A"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      {name && (
                        <p className="text-sm font-semibold px-2">{name}</p>
                      )}
                      {email && <p className="text-sm px-2">{email}</p>}
                    </div>
                  </div>
                  <div className="flex flex-row mr-2 items-center gap-3">
                    <Button
                      onClick={handleDownloadPDF}
                      className="bg-orange-500 hover:bg-orange-600 p-2"
                      title="Download PDF Report"
                    >
                      <FileText size={16} className="mr-2" />
                      Download PDF
                    </Button>
                    <Select
                      value={candidateStatus}
                      onValueChange={async (newValue: string) => {
                        setCandidateStatus(newValue);
                        await ResponseService.updateResponse(
                          { candidate_status: newValue },
                          call_id,
                        );
                        onCandidateStatusChange(call_id, newValue);
                      }}
                    >
                      <SelectTrigger className="w-[180px]  bg-slate-50 rounded-2xl">
                        <SelectValue placeholder="Not Selected" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CandidateStatus.NO_STATUS}>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2" />
                            No Status
                          </div>
                        </SelectItem>
                        <SelectItem value={CandidateStatus.NOT_SELECTED}>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                            Not Selected
                          </div>
                        </SelectItem>
                        <SelectItem value={CandidateStatus.POTENTIAL}>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2" />
                            Potential
                          </div>
                        </SelectItem>
                        <SelectItem value={CandidateStatus.SELECTED}>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                            Selected
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button
                          disabled={isClicked}
                          className="bg-red-500 hover:bg-red-600 p-2"
                        >
                          <TrashIcon size={16} className="" />
                        </Button>
                      </AlertDialogTrigger>

                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>

                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete this response.
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>

                          <AlertDialogAction
                            className="bg-indigo-600 hover:bg-indigo-800"
                            onClick={async () => {
                              await onDeleteResponseClick();
                            }}
                          >
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {/* Show different content based on whether this is a CV upload or interview */}
                {isCVUpload ? (
                  <div className="flex flex-col mt-3">
                    <p className="font-semibold">CV Document</p>
                    <div className="flex flex-row gap-3 mt-2 items-center">
                      <span className="text-sm text-gray-600">{cvFileName || "Uploaded CV"}</span>
                      {cvUrl && (
                        <a
                          className="text-purple-500 hover:text-purple-700 transition-colors"
                          href={cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download CV"
                          title="Download CV"
                        >
                          <DownloadIcon size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col mt-3">
                    <p className="font-semibold">Interview Recording</p>
                    <div className="flex flex-row gap-3 mt-2 items-center">
                      {call?.recording_url ? (
                        <>
                          <ReactAudioPlayer src={call.recording_url} controls />
                          <a
                            className="my-auto text-gray-600 hover:text-gray-800 transition-colors"
                            href={call.recording_url}
                            download=""
                            aria-label="Download Recording"
                            title="Download Recording"
                          >
                            <DownloadIcon size={20} />
                          </a>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500 italic">
                          No recording available
                        </span>
                      )}
                      {/* CV Download - same style as recording download */}
                      {hasAttachedCV && cvUrl && (
                        <a
                          className="my-auto text-orange-500 hover:text-orange-700 transition-colors"
                          href={cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download CV"
                          title="Download CV"
                        >
                          <FileText size={20} />
                        </a>
                      )}
                      {hasAttachedCV && !cvUrl && (
                        <span 
                          className="my-auto text-orange-400 cursor-help"
                          title="CV content used in evaluation (file not stored)"
                        >
                          <FileText size={20} />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* <div>{call.}</div> */}
          </div>
          <div className="bg-slate-200 rounded-2xl p-4 px-5 my-3">
            <p className="font-semibold mb-3">General Summary</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Weighted Score Card - Top Left */}
              {analytics?.weightedOverallScore !== undefined && analytics?.customMetrics && (
                <div className="flex flex-col p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      classNames={{
                        svg: "w-20 h-20 drop-shadow-md",
                        indicator: "stroke-indigo-600",
                        track: "stroke-indigo-600/10",
                        value: "text-2xl font-bold text-indigo-600",
                      }}
                      value={Math.round(analytics?.weightedOverallScore || 0)}
                      strokeWidth={4}
                      showValueLabel={true}
                      formatOptions={{ signDisplay: "never" }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <Scale className="h-4 w-4 text-indigo-600" />
                        <p className="font-semibold text-base text-indigo-700">Weighted Score</p>
                      </div>
                      <p className="text-xs text-gray-500">Based on {analytics.customMetrics.length} metrics</p>
                    </div>
                  </div>
                  {/* Metrics Summary */}
                  <div className="mt-3 pt-3 border-t border-indigo-200 space-y-1">
                    {analytics.customMetrics.slice(0, 4).map((metric: CustomMetricScore) => (
                      <div key={metric.metricId} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700 truncate max-w-[150px]">{metric.title}</span>
                        <span className={`font-semibold ${metric.score >= 7 ? 'text-green-600' : metric.score >= 4 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {Math.round(metric.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Hiring Score Card - Top Right */}
              {analytics?.overallScore !== undefined && (
                <div className="flex flex-col p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      classNames={{
                        svg: "w-20 h-20 drop-shadow-md",
                        indicator: "stroke-orange-500",
                        track: "stroke-orange-500/10",
                        value: "text-2xl font-bold text-orange-500",
                      }}
                      value={analytics?.overallScore}
                      strokeWidth={4}
                      showValueLabel={true}
                      formatOptions={{ signDisplay: "never" }}
                    />
                    <p className="font-semibold text-base">Overall Hiring Score</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                    {analytics?.overallFeedback || "No feedback available"}
                  </p>
                </div>
              )}

              {/* Communication Card - Bottom Left */}
              {analytics?.communication && (
                <div className="flex flex-col p-4 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      classNames={{
                        svg: "w-20 h-20 drop-shadow-md",
                        indicator: "stroke-blue-500",
                        track: "stroke-blue-500/10",
                        value: "text-2xl font-bold text-blue-500",
                      }}
                      value={analytics?.communication.score}
                      maxValue={10}
                      minValue={0}
                      strokeWidth={4}
                      showValueLabel={true}
                      valueLabel={
                        <div className="flex items-baseline">
                          {Math.round(analytics?.communication.score ?? 0)}
                        </div>
                      }
                      formatOptions={{ signDisplay: "never" }}
                    />
                    <p className="font-semibold text-base">Communication</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3">
                    {analytics?.communication.feedback || "No feedback available"}
                  </p>
                </div>
              )}

              {/* Sentiment & Summary Card - Bottom Right */}
              <div className="flex flex-col p-4 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium">Sentiment:</p>
                  <span className={`text-sm font-semibold ${
                    call?.call_analysis?.user_sentiment === "Positive" ? "text-green-600" :
                    call?.call_analysis?.user_sentiment === "Negative" ? "text-red-500" : "text-yellow-600"
                  }`}>
                    {call?.call_analysis?.user_sentiment || "Unknown"}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    call?.call_analysis?.user_sentiment === "Positive" ? "bg-green-500" :
                    call?.call_analysis?.user_sentiment === "Negative" ? "bg-red-500" : "bg-yellow-500"
                  }`} />
                </div>
                <p className="text-xs text-gray-600 line-clamp-4">
                  {call?.call_analysis?.call_summary || "No summary available"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Custom Metrics Section */}
          {analytics?.customMetrics && analytics.customMetrics.length > 0 && (
            <div className="bg-slate-200 rounded-2xl min-h-[120px] p-4 px-5 my-3">
              <div className="flex items-center gap-2 my-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                <p className="font-semibold">Custom Evaluation Metrics</p>
                {analytics.weightedOverallScore !== undefined && (
                  <div className="ml-auto flex items-center gap-2 bg-indigo-100 px-3 py-1 rounded-lg">
                    <span className="text-sm font-medium text-indigo-700">Weighted Score:</span>
                    <span className="text-xl font-bold text-indigo-600">{Math.round(analytics.weightedOverallScore)}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-2 mt-4">
                {analytics.customMetrics.map((metric: CustomMetricScore) => (
                  <div
                    key={metric.metricId}
                    className="flex flex-col gap-2 text-sm p-4 rounded-2xl bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-base">{metric.title}</p>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Weight: {metric.weight}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`text-3xl font-bold ${
                        metric.score >= 7 ? 'text-green-600' : 
                        metric.score >= 4 ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {Math.round(metric.score ?? 0)}
                      </div>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            metric.score >= 7 ? 'bg-green-500' : 
                            metric.score >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(metric.score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mt-1 line-clamp-3">
                      <span className="font-medium text-gray-700">Reasoning: </span>
                      {metric.feedback || "No reasoning provided"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {analytics &&
            analytics.questionSummaries &&
            analytics.questionSummaries.length > 0 && (
              <div className="bg-slate-200 rounded-2xl min-h-[120px] p-4 px-5 my-3">
                <p className="font-semibold my-2 mb-4">Question Summary</p>
                <ScrollArea className="rounded-md h-72 text-sm mt-3 py-3 leading-6 overflow-y-scroll whitespace-pre-line px-2">
                  {analytics?.questionSummaries.map((qs, index) => (
                    <QuestionAnswerCard
                      key={qs.question}
                      questionNumber={index + 1}
                      question={qs.question}
                      answer={qs.summary}
                    />
                  ))}
                </ScrollArea>
              </div>
            )}
          <div className="bg-slate-200 rounded-2xl min-h-[150px] max-h-[500px] p-4 px-5 mb-[150px]">
            <p className="font-semibold my-2 mb-4">
              {isCVUpload ? "CV Content" : "Transcript"}
            </p>
            <ScrollArea className="rounded-2xl text-sm h-96  overflow-y-auto whitespace-pre-line px-2">
              <div
                className="text-sm p-4 rounded-2xl leading-5 bg-slate-50"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: marked(transcript || "") as string }}
              />
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}

export default CallInfo;
