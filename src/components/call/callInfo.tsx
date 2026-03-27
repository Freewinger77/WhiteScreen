"use client";

import React, { useEffect, useState } from "react";
import { Analytics, CallData, CustomMetricScore } from "@/types/response";
import axios from "axios";
import ReactAudioPlayer from "react-audio-player";
import { TrashIcon, FileText, Info, Video, Download, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ResponseService } from "@/services/responses.service";
import { usePageTransition } from "@/components/PageTransition";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { generateIndividualCandidatePDF } from "@/lib/pdf-generator";
import { useInterviews } from "@/contexts/interviews.context";

type CallProps = {
  call_id: string;
  onDeleteResponse: (deletedCallId: string) => void;
  onCandidateStatusChange: (callId: string, newStatus: string) => void;
};

// Skeleton Loader Component
function ReportSkeleton() {
  return (
    <div className="animate-pulse p-5 space-y-4">
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-gray-200 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 bg-gray-200 rounded-lg" />
            <div className="h-8 w-8 bg-gray-200 rounded-lg" />
            <div className="h-8 w-8 bg-gray-200 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-44 bg-gray-200 rounded" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-7 w-7 bg-gray-200 rounded-md" />
            <div className="h-7 w-7 bg-gray-200 rounded-md" />
          </div>
        </div>
      </div>

      {/* Summary Grid Skeleton */}
      <div className="bg-white rounded-xl p-3">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="h-2 w-full bg-gray-100 rounded" />
                <div className="h-2 w-3/4 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="bg-[#F9F9FA] rounded-[20px] p-6">
        <div className="flex justify-between mb-4">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 bg-white rounded-2xl p-5">
              <div className="flex justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
                <div className="h-14 w-14 bg-gray-200 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full bg-gray-100 rounded" />
                <div className="h-2 w-4/5 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const { navigateWithTransition } = usePageTransition();
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [interviewName, setInterviewName] = useState<string>("");
  const { getInterviewById } = useInterviews();

  const formatLinkedInUrl = (url: string | null): string => {
    if (!url) { return ''; }
    if (url.includes('linkedin.com/')) {
      return url.startsWith('http') ? url : `https://${url}`;
    }
    const userId = url.replace(/^@/, '').trim();
    return `https://www.linkedin.com/in/${userId}`;
  };

  const formatGitHubUrl = (url: string | null): string => {
    if (!url) { return ''; }
    if (url.includes('github.com/')) {
      return url.startsWith('http') ? url : `https://${url}`;
    }
    const userId = url.replace(/^@/, '').trim();
    return `https://github.com/${userId}`;
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case CandidateStatus.SELECTED: return "bg-green-50";
      case CandidateStatus.NOT_SELECTED: return "bg-red-50";
      case CandidateStatus.POTENTIAL: return "bg-yellow-50";
      default: return "bg-gray-50";
    }
  };

  useEffect(() => {
    const fetchResponses = async () => {
      setIsLoading(true);
      setCall(undefined);
      setEmail("");
      setName("");

      try {
        const response = await axios.post("/api/get-call", { id: call_id });
        setCall(response.data.callResponse);
        setAnalytics(response.data.analytics);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResponses();
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
        
        const interview = await getInterviewById(response.interview_id);
        if (interview) {
          setInterviewName(interview.name);
        }
        
        if (response.details?.source === "cv_upload") {
          setIsCVUpload(true);
          setCvFileName(response.details.fileName || "");
          setCvUrl(response.cv_url || null);
          setHasAttachedCV(false);
        } else {
          setIsCVUpload(false);
          const attachedCv = response.details?.attached_cv;
          if (attachedCv?.text) {
            setHasAttachedCV(true);
            setCvUrl(attachedCv.url || null);
            setCvFileName(attachedCv.fileName || "");
          } else {
            setHasAttachedCV(false);
            setCvUrl(null);
            setCvFileName("");
          }
          
          setVideoUrl(response.video_url || null);
          
          const details = response.details || {};
          setLinkedinUrl(details.linkedin_url || (response.profile_type === 'linkedin' ? response.profile_id : null));
          setGithubUrl(details.github_url || (response.profile_type === 'github' ? response.profile_id : null));
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

      let updatedTranscript = transcript
        .replace(/Agent:/g, agentReplacement)
        .replace(/User:/g, userReplacement);

      updatedTranscript = updatedTranscript.replace(/(?:\r\n|\r|\n)/g, "\n\n");

      return updatedTranscript;
    };

    if (call && call.transcript) {
      setTranscript(replaceAgentAndUser(call.transcript as string, name || "Candidate"));
    } else if (call && !call.transcript && call?.details?.source !== "cv_upload") {
      setTranscript("*No transcript available for this interview.*");
    } else if (call?.details?.source === "cv_upload") {
      const cvAnalysisDisplay = (analytics as any)?.cvAnalysis?.cvAnalysisDisplay;
      
      if (cvAnalysisDisplay) {
        let formattedAnalysis = `## 📋 CV Analysis\n\n`;
        
        if (cvAnalysisDisplay.profileSummary) {
          formattedAnalysis += `### Profile Summary\n${cvAnalysisDisplay.profileSummary}\n\n`;
        }
        
        if (cvAnalysisDisplay.workHistory?.length > 0) {
          formattedAnalysis += `### 💼 Work Experience\n`;
          cvAnalysisDisplay.workHistory.forEach((job: any) => {
            formattedAnalysis += `**${job.role}** at *${job.company}*\n`;
            if (job.duration) { formattedAnalysis += `📅 ${job.duration}\n`; }
            if (job.highlights?.length > 0) {
              job.highlights.forEach((h: string) => {
                formattedAnalysis += `- ${h}\n`;
              });
            }
            formattedAnalysis += `\n`;
          });
        }
        
        if (cvAnalysisDisplay.educationDetails?.length > 0) {
          formattedAnalysis += `### 🎓 Education\n`;
          cvAnalysisDisplay.educationDetails.forEach((edu: any) => {
            formattedAnalysis += `**${edu.degree}** - ${edu.institution}`;
            if (edu.year) { formattedAnalysis += ` (${edu.year})`; }
            formattedAnalysis += `\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        if (cvAnalysisDisplay.technicalSkills?.length > 0) {
          formattedAnalysis += `### 🛠️ Technical Skills\n`;
          cvAnalysisDisplay.technicalSkills.forEach((category: any) => {
            formattedAnalysis += `**${category.category}:** ${category.skills?.join(", ") || "N/A"}\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        if (cvAnalysisDisplay.achievements?.length > 0) {
          formattedAnalysis += `### 🏆 Key Achievements\n`;
          cvAnalysisDisplay.achievements.forEach((a: string) => {
            formattedAnalysis += `- ${a}\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        if (cvAnalysisDisplay.strengths?.length > 0) {
          formattedAnalysis += `### ✅ Strengths\n`;
          cvAnalysisDisplay.strengths.forEach((s: string) => {
            formattedAnalysis += `- ${s}\n`;
          });
          formattedAnalysis += `\n`;
        }
        
        if (cvAnalysisDisplay.areasOfConcern?.length > 0) {
          formattedAnalysis += `### ⚠️ Areas to Explore\n`;
          cvAnalysisDisplay.areasOfConcern.forEach((c: string) => {
            formattedAnalysis += `- ${c}\n`;
          });
        }
        
        setTranscript(formattedAnalysis);
      } else {
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

        navigateWithTransition(`/interviews/${interview_id}`);

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

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 70) { return "text-green-600"; }
    if (percentage >= 40) { return "text-amber-500"; }
    return "text-red-500";
  };

  const getSentimentColor = (sentiment: string | undefined) => {
    if (sentiment === "Positive") { return { text: "text-green-600", bg: "bg-green-500" }; }
    if (sentiment === "Negative") { return { text: "text-red-500", bg: "bg-red-500" }; }
    return { text: "text-amber-500", bg: "bg-amber-500" };
  };

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-y-auto bg-gray-50">
        {isLoading ? (
          <ReportSkeleton />
        ) : (
          <div className="animate-fadeIn p-5 space-y-4">
            {/* Candidate Header Card */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 bg-gray-200">
                    <AvatarFallback className="text-base font-semibold text-gray-700">
                      {name ? name[0].toUpperCase() : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{name || "Anonymous"}</p>
                      <div className="flex items-center gap-1.5">
                        {(hasAttachedCV || cvUrl) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {cvUrl ? (
                                <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                                  <FileText size={14} />
                                </a>
                              ) : (
                                <span className="text-gray-400"><FileText size={14} /></span>
                              )}
                            </TooltipTrigger>
                            <TooltipContent>CV attached</TooltipContent>
                          </Tooltip>
                        )}
                        {linkedinUrl && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a 
                                href={formatLinkedInUrl(linkedinUrl)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 transition-colors"
                              >
                                <img src="/icons/linkedin.png" alt="LinkedIn" className="w-4 h-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Open LinkedIn</TooltipContent>
                          </Tooltip>
                        )}
                        {githubUrl && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a 
                                href={formatGitHubUrl(githubUrl)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 transition-colors"
                              >
                                <img src="/icons/github.png" alt="GitHub" className="w-4 h-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Open GitHub</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{email}</p>
                  </div>
                </div>

                {/* Right: Tab Switch Badge, Status, Download, Delete */}
                <div className="flex items-center gap-2">
                  {tabSwitchCount !== undefined && tabSwitchCount !== null && tabSwitchCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-full px-3 py-1 cursor-help">
                          Tab Switching Detected ({tabSwitchCount}x)
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-gray-800 text-white max-w-xs p-3">
                        <p className="font-semibold mb-1">⚠️ Tab Switching</p>
                        <p className="text-xs text-gray-300">{tabSwitchCount} switch{tabSwitchCount > 1 ? 'es' : ''} detected</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Select
                    value={candidateStatus}
                    onValueChange={async (newValue: string) => {
                      setCandidateStatus(newValue);
                      await ResponseService.updateResponse({ candidate_status: newValue }, call_id);
                      onCandidateStatusChange(call_id, newValue);
                    }}
                  >
                    <SelectTrigger className={`w-[130px] h-8 text-xs rounded-lg border-gray-200 ${getStatusBgColor(candidateStatus)}`}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CandidateStatus.NO_STATUS}>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                          No Status
                        </div>
                      </SelectItem>
                      <SelectItem value={CandidateStatus.NOT_SELECTED}>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                          Not Selected
                        </div>
                      </SelectItem>
                      <SelectItem value={CandidateStatus.POTENTIAL}>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                          Potential
                        </div>
                      </SelectItem>
                      <SelectItem value={CandidateStatus.SELECTED}>
                        <div className="flex items-center text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                          Selected
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleDownloadPDF} size="icon" variant="outline" className="h-8 w-8 border-gray-200">
                        <Download size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Download Report</TooltipContent>
                  </Tooltip>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={isClicked} variant="outline" size="icon" className="h-8 w-8 border-red-200 text-red-500 hover:bg-red-50">
                        <TrashIcon size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Response</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this candidate&apos;s response.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-500 hover:bg-red-600 rounded-lg" onClick={onDeleteResponseClick}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Recording Row */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium text-gray-500">
                    {isCVUpload ? "CV Document" : "Interview Recording"}
                  </p>
                  {isCVUpload ? (
                    <span className="text-xs text-gray-600">{cvFileName || "Uploaded CV"}</span>
                  ) : (
                    <>
                      {call?.recording_url ? (
                        <ReactAudioPlayer src={call.recording_url} controls className="h-7" style={{ width: '200px' }} />
                      ) : (
                        <span className="text-xs text-gray-400 italic">No recording</span>
                      )}
                    </>
                  )}
                </div>
                {/* Download Buttons - Outline Style */}
                <div className="flex items-center gap-1.5">
                  {call?.recording_url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={call.recording_url} download="" className="inline-flex items-center justify-center h-7 w-7 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md transition-colors">
                          <Volume2 size={14} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Download Audio</TooltipContent>
                    </Tooltip>
                  )}
                  {(hasAttachedCV || isCVUpload) && cvUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a href={cvUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-7 w-7 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md transition-colors">
                          <FileText size={14} />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Download CV</TooltipContent>
                    </Tooltip>
                  )}
                  {videoUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={() => {
                            setIsVideoLoading(true);
                            setIsVideoModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center h-7 w-7 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md transition-colors"
                        >
                          <Video size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">View Video</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Grid - 2x2 - No Header */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                {/* Weighted Score */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">Weighted Score</p>
                      <p className="text-[10px] text-gray-500">Based on {analytics?.customMetrics?.length || 0} metrics</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                      <span className="text-sm font-bold text-indigo-600">
                        {analytics?.weightedOverallScore ? (analytics.weightedOverallScore / 10).toFixed(1) : "–"}
                      </span>
                    </div>
                  </div>
                  {analytics?.customMetrics && (
                    <div className="mt-2 pt-2 border-t border-indigo-100 space-y-0.5">
                      {analytics.customMetrics.slice(0, 3).map((metric: CustomMetricScore) => (
                        <div key={metric.metricId} className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-600 truncate max-w-[90px]">{metric.title}</span>
                          <span className={`font-semibold ${getScoreColor(metric.score, 10)}`}>
                            {Math.round(metric.score)}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overall Hiring Score */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm text-gray-900">Overall Hiring Score</p>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-purple-100 flex items-center justify-center">
                      <span className={`text-sm font-bold ${getScoreColor(analytics?.overallScore || 0)}`}>
                        {analytics?.overallScore || "–"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                    {analytics?.overallFeedback || "No feedback available"}
                  </p>
                </div>

                {/* Communication */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm text-gray-900">Communication</p>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        {analytics?.communication?.score ? Math.round(analytics.communication.score) : "–"}
                        <span className="text-[8px] text-blue-400">/10</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                    {analytics?.communication?.feedback || "No feedback available"}
                  </p>
                </div>

                {/* Sentiment */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm text-gray-900">Sentiment</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${getSentimentColor(call?.call_analysis?.user_sentiment).bg}`} />
                      <span className={`text-xs font-medium ${getSentimentColor(call?.call_analysis?.user_sentiment).text}`}>
                        {call?.call_analysis?.user_sentiment || "Neutral"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                    {call?.call_analysis?.call_summary || "No summary available"}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Evaluation Metrics - Full Width Row */}
            {analytics?.customMetrics && analytics.customMetrics.length > 0 && (
              <div className="bg-[#F9F9FA] rounded-[20px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-900">Custom Evaluation Metrics</p>
                  <span className="text-sm text-indigo-600">
                    Weighted Score: <span className="text-lg font-bold">{analytics.weightedOverallScore ? (analytics.weightedOverallScore / 10).toFixed(1) : "–"}</span>
                  </span>
                </div>
                
                <div className="flex gap-4">
                  {analytics.customMetrics.map((metric: CustomMetricScore) => (
                    <div
                      key={metric.metricId}
                      className="flex-1 bg-white rounded-2xl p-5 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p className="font-medium text-gray-900 text-sm">{metric.title}</p>
                            <Tooltip>
                              <TooltipTrigger><Info size={12} className="text-gray-400 flex-shrink-0" /></TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">{metric.feedback || "No details"}</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-gray-500">Weight: {metric.weight}</p>
                        </div>
                        {/* Circular Score */}
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="#E5E7EB"
                              strokeWidth="4"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="24"
                              fill="none"
                              stroke="#8B5CF6"
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${(metric.score / 10) * 150.8} 150.8`}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-900">
                              {Math.round(metric.score)}<span className="text-[10px] text-gray-400">/10</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-4 leading-relaxed">
                        <span className="font-medium">Feedback:</span> {metric.feedback || "Insufficient evidence in transcript"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question Summary */}
            {analytics && analytics.questionSummaries && analytics.questionSummaries.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-2">Question Summary</p>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {analytics.questionSummaries.map((qs, index) => (
                    <QuestionAnswerCard
                      key={qs.question}
                      questionNumber={index + 1}
                      question={qs.question}
                      answer={qs.summary}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {isCVUpload ? "CV Analysis" : "Transcript"}
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-3">
                <div
                  className="text-[11px] leading-5 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: marked(transcript || "") as string }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsVideoModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 w-full max-w-4xl mx-4 animate-scaleIn">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Interview Recording</h3>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a 
                        href={videoUrl} 
                        download 
                        className="inline-flex items-center justify-center h-8 w-8 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                      >
                        <Download size={16} />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Download Video</TooltipContent>
                  </Tooltip>
                  <button 
                    onClick={() => setIsVideoModalOpen(false)}
                    className="inline-flex items-center justify-center h-8 w-8 hover:bg-gray-100 text-gray-500 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              {/* Video Container */}
              <div className="relative bg-black aspect-video">
                {/* Video Skeleton Loader */}
                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 animate-pulse">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                        <Video size={28} className="text-gray-500" />
                      </div>
                      <div className="h-2 w-32 bg-gray-700 rounded-full" />
                      <p className="text-xs text-gray-500">Loading video...</p>
                    </div>
                  </div>
                )}
                
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay
                  className={`w-full h-full transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoadedData={() => setIsVideoLoading(false)}
                  onCanPlay={() => setIsVideoLoading(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}

export default CallInfo;
