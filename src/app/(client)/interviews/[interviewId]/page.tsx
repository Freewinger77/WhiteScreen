"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import React, { useState, useEffect, useMemo } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useInterviews } from "@/contexts/interviews.context";
import {
  Settings2,
  Filter,
  Pencil,
  Clock,
  CheckCircle2,
  Users,
  FileUp,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Smile,
  UserCircle,
  Calendar,
  Info,
  ExternalLink,
  Settings,
  X,
} from "lucide-react";
import axios from "axios";
import { ResponseService } from "@/services/responses.service";
import { usePageTransition } from "@/components/PageTransition";
import { ClientService } from "@/services/clients.service";
import { Interview } from "@/types/interview";
import { Response } from "@/types/response";
import { formatTimestampToDateHHMM } from "@/lib/utils";
import CallInfo from "@/components/call/callInfo";
import { InterviewService } from "@/services/interviews.service";
import EditInterview from "@/components/dashboard/interview/editInterview";
import Modal from "@/components/dashboard/Modal";
import { toast } from "sonner";
import { ChromePicker } from "react-color";
import SharePopup from "@/components/dashboard/interview/sharePopup";
import CVUploader from "@/components/dashboard/interview/cvUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandidateStatus } from "@/lib/enum";
import { generateAllCandidatesPDF } from "@/lib/pdf-generator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  params: {
    interviewId: string;
  };
  searchParams: {
    call: string;
    edit: boolean;
  };
}

const base_url = process.env.NEXT_PUBLIC_LIVE_URL;

function InterviewHome({ params, searchParams }: Props) {
  const [interview, setInterview] = useState<Interview>();
  const [responses, setResponses] = useState<Response[]>();
  const { getInterviewById } = useInterviews();
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const { navigateWithTransition } = usePageTransition();
  const [isActive, setIsActive] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);
  const [interviewLoading, setInterviewLoading] = useState<boolean>(true);
  const [responsesLoading, setResponsesLoading] = useState<boolean>(true);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [themeColor, setThemeColor] = useState<string>("#4F46E5");
  const [iconColor, seticonColor] = useState<string>("#4F46E5");
  const { organization } = useOrganization();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isCVUploaderOpen, setIsCVUploaderOpen] = useState(false);
  const [mainTab, setMainTab] = useState<"all" | "interviews" | "cvs">("all");
  const [sidebarTab, setSidebarTab] = useState<"interviews" | "cvs">("interviews");
  const [isReanalyzingCVs, setIsReanalyzingCVs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("weightedScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>([]);

  useEffect(() => {
    const fetchInterview = async () => {
      setInterviewLoading(true);
      try {
        const response = await getInterviewById(params.interviewId);
        setInterview(response);
        setIsActive(response.is_active);
        setThemeColor(response.theme_color ?? "#4F46E5");
        seticonColor(response.theme_color ?? "#4F46E5");
      } catch (error) {
        console.error(error);
      } finally {
        setInterviewLoading(false);
      }
    };
    if (!interview || !isGeneratingInsights) {
      fetchInterview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.interviewId]);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        if (organization?.id) {
          const data = await ClientService.getOrganizationById(
            organization.id,
            organization.name,
            organization.imageUrl
          );
          if (data?.plan) {
            setCurrentPlan(data.plan);
          }
        }
      } catch (error) {
        console.error("Error fetching organization data:", error);
      }
    };
    fetchOrganizationData();
  }, [organization]);

  useEffect(() => {
    const fetchResponses = async () => {
      setResponsesLoading(true);
      try {
        const response = await ResponseService.getAllResponses(params.interviewId);
        setResponses(response);
      } catch (error) {
        console.error(error);
      } finally {
        setResponsesLoading(false);
      }
    };
    fetchResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteResponse = (deletedCallId: string) => {
    if (responses) {
      setResponses(responses.filter((response) => response.call_id !== deletedCallId));
      if (searchParams.call === deletedCallId) {
        navigateWithTransition(`/interviews/${params.interviewId}`);
      }
    }
  };

  const handleResponseClick = async (response: Response) => {
    try {
      await ResponseService.saveResponse({ is_viewed: true }, response.call_id);
      if (responses) {
        const updatedResponses = responses.map((r) =>
          r.call_id === response.call_id ? { ...r, is_viewed: true } : r
        );
        setResponses(updatedResponses);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggle = async () => {
    try {
      const updatedIsActive = !isActive;
      setIsActive(updatedIsActive);
      await InterviewService.updateInterview({ is_active: updatedIsActive }, params.interviewId);
      toast.success("Interview status updated", {
        description: `The interview is now ${updatedIsActive ? "active" : "inactive"}.`,
        position: "bottom-right",
        duration: 3000,
      });
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Failed to update the interview status.", duration: 3000 });
    }
  };

  const handleThemeColorChange = async (newColor: string) => {
    try {
      await InterviewService.updateInterview({ theme_color: newColor }, params.interviewId);
      toast.success("Theme color updated", { position: "bottom-right", duration: 3000 });
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Failed to update the theme color.", duration: 3000 });
    }
  };

  const handleCandidateStatusChange = (callId: string, newStatus: string) => {
    setResponses((prevResponses) =>
      prevResponses?.map((response) =>
        response.call_id === callId ? { ...response, candidate_status: newStatus } : response
      )
    );
  };

  const refreshResponses = async () => {
    try {
      const response = await ResponseService.getAllResponses(params.interviewId);
      setResponses(response);
    } catch (error) {
      console.error("Error refreshing responses:", error);
    }
  };

  const handleColorChange = (color: any) => setThemeColor(color.hex);

  const applyColorChange = () => {
    if (themeColor !== iconColor) {
      seticonColor(themeColor);
      handleThemeColorChange(themeColor);
    }
    setShowColorPicker(false);
  };

  // Custom metrics are hidden by default - user must enable them from settings

  // Filter and sort for main table
  const filterMainResponses = useMemo(() => {
    if (!responses) return [];
    let filtered = [...responses];
    if (mainTab === "interviews") {
      filtered = filtered.filter((r) => r?.details?.source !== "cv_upload");
    } else if (mainTab === "cvs") {
      filtered = filtered.filter((r) => r?.details?.source === "cv_upload");
    }
    if (searchQuery) {
      filtered = filtered.filter((r) =>
        r?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort the results
    filtered.sort((a, b) => {
      let aVal: number = 0;
      let bVal: number = 0;
      
      if (sortColumn === "weightedScore") {
        aVal = a?.analytics?.weightedOverallScore ?? a?.analytics?.overallScore ?? 0;
        bVal = b?.analytics?.weightedOverallScore ?? b?.analytics?.overallScore ?? 0;
      } else if (sortColumn === "overallScore") {
        aVal = a?.analytics?.overallScore ?? 0;
        bVal = b?.analytics?.overallScore ?? 0;
      } else if (sortColumn.startsWith("metric_")) {
        const metricId = sortColumn.replace("metric_", "");
        const aMetric = a?.analytics?.customMetrics?.find((m: any) => m.metricId === metricId);
        const bMetric = b?.analytics?.customMetrics?.find((m: any) => m.metricId === metricId);
        aVal = aMetric?.score ?? 0;
        bVal = bMetric?.score ?? 0;
      }
      
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });
    
    return filtered;
  }, [responses, mainTab, searchQuery, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Toggle metric visibility
  const toggleMetricVisibility = (metricId: string) => {
    setVisibleMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]
    );
  };

  // Filter for sidebar
  const filterSidebarResponses = () => {
    if (!responses) return [];
    let filtered = responses.filter((r) => {
      const isCVUpload = r?.details?.source === "cv_upload";
      return sidebarTab === "cvs" ? isCVUpload : !isCVUpload;
    });
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((r) => r?.candidate_status === filterStatus);
    }
    return filtered;
  };

  const interviewCount = responses?.filter((r) => r?.details?.source !== "cv_upload").length || 0;
  const cvCount = responses?.filter((r) => r?.details?.source === "cv_upload").length || 0;
  const totalResponses = responses?.length || 0;

  // Calculate stats - duration is in seconds directly on response object
  const avgDuration = responses && responses.length > 0
    ? Math.round(responses.reduce((acc, r) => acc + (r?.duration || 0), 0) / responses.length)
    : 0;
  const avgDurationStr = avgDuration > 60 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : `${avgDuration}s`;
  const completionRate = responses && responses.length > 0
    ? Math.round((responses.filter((r) => r?.is_analysed).length / responses.length) * 100)
    : 0;

  // Sentiment counts - from user feedback/call analysis
  const sentimentCounts = useMemo(() => {
    if (!responses) return { positive: 0, neutral: 0, negative: 0 };
    return {
      positive: responses.filter((r) => {
        const sentiment = r?.details?.call_analysis?.user_sentiment?.toLowerCase() || 
                         r?.analytics?.sentiment?.toLowerCase();
        return sentiment === "positive";
      }).length,
      neutral: responses.filter((r) => {
        const sentiment = r?.details?.call_analysis?.user_sentiment?.toLowerCase() || 
                         r?.analytics?.sentiment?.toLowerCase();
        return sentiment === "neutral";
      }).length,
      negative: responses.filter((r) => {
        const sentiment = r?.details?.call_analysis?.user_sentiment?.toLowerCase() || 
                         r?.analytics?.sentiment?.toLowerCase();
        return sentiment === "negative";
      }).length,
    };
  }, [responses]);

  // Status counts
  const statusCounts = {
    selected: responses?.filter((r) => r?.candidate_status === "SELECTED").length || 0,
    potential: responses?.filter((r) => r?.candidate_status === "POTENTIAL").length || 0,
    notSelected: responses?.filter((r) => r?.candidate_status === "NOT_SELECTED").length || 0,
    noStatus: responses?.filter((r) => !r?.candidate_status || r?.candidate_status === "NO_STATUS").length || 0,
  };

  const handleReanalyzeCVs = async () => {
    if (cvCount === 0) {
      toast.error("No CV responses to re-analyze", { position: "bottom-right", duration: 3000 });
      return;
    }
    setIsReanalyzingCVs(true);
    try {
      const response = await axios.post("/api/reanalyze-cv", { interviewId: params.interviewId });
      if (response.data.success) {
        toast.success(response.data.message, { position: "bottom-right", duration: 5000 });
        await refreshResponses();
      }
    } catch (error: any) {
      console.error("Error re-analyzing CVs:", error);
      toast.error(error?.response?.data?.error || "Failed to re-analyze CVs", { position: "bottom-right", duration: 3000 });
    } finally {
      setIsReanalyzingCVs(false);
    }
  };

  const handleDownloadAllCandidatesPDF = async () => {
    if (!responses || responses.length === 0) {
      toast.error("No candidates to download.", { position: "bottom-right", duration: 3000 });
      return;
    }
    try {
      await generateAllCandidatesPDF(responses, interview);
      toast.success("All candidates PDF downloaded successfully!", { position: "bottom-right", duration: 3000 });
    } catch (error) {
      console.error("Error generating all candidates PDF:", error);
      toast.error("Failed to generate PDF.", { position: "bottom-right", duration: 3000 });
    }
  };

  const isLoading = interviewLoading || responsesLoading;

  // If viewing a specific call or editing
  if (searchParams.call || searchParams.edit) {
    return (
      <div className="flex h-full w-full">
        <div className="flex-1 overflow-y-auto p-6">
          {searchParams.call ? (
            <CallInfo
              call_id={searchParams.call}
              onDeleteResponse={handleDeleteResponse}
              onCandidateStatusChange={handleCandidateStatusChange}
            />
          ) : (
            <EditInterview interview={interview} />
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-68px)] w-full bg-white overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-6 animate-fadeIn">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-4 w-full max-w-2xl bg-gray-200 rounded animate-pulse mb-6" />
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
              <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header - Fixed */}
              <div className="p-6 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-semibold text-gray-900">{interview?.name}</h1>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={handleDownloadAllCandidatesPDF}
                    >
                      <Settings2 size={14} />
                      Download all reports
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => setIsCVUploaderOpen(true)}
                    >
                      <FileUp size={14} />
                      Upload CVs
                    </Button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-[#FFF9E6] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Total Responses</span>
                      <Users size={16} className="text-gray-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{totalResponses}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F0F7FF] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Average Duration</span>
                      <Clock size={16} className="text-gray-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{avgDurationStr}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F0FFF4] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Interview Completion Rate</span>
                      <CheckCircle2 size={16} className="text-gray-400" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{completionRate}%</p>
                  </div>
                </div>
              </div>

              {/* Sort & Manage - Scrollable */}
              <div className="flex-1 overflow-hidden flex flex-col px-6 min-h-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h2 className="text-sm font-semibold text-gray-900">Sort & Manage</h2>
                  <p className="text-xs text-gray-500">
                    Interviewer used: <span className="font-medium text-gray-700">{interview?.interviewer_id ? "Empathetic Echo" : "None"}</span>
                  </p>
                </div>

                {/* Tabs + Toolbar in same row */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    {["all", "interviews", "cvs"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMainTab(tab as any)}
                        className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          mainTab === tab
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {tab === "all" ? "All" : tab === "interviews" ? "Interviews" : "CVs"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Settings for column visibility */}
                    <div className="relative">
                      <button
                        onClick={() => setShowColumnSettings(!showColumnSettings)}
                        className={`p-1.5 rounded-lg hover:bg-gray-100 ${showColumnSettings ? "bg-gray-100" : ""}`}
                      >
                        <Settings size={14} className="text-gray-500" />
                      </button>
                      {showColumnSettings && interview?.custom_metrics && interview.custom_metrics.length > 0 && (
                        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">Show/Hide Metrics</span>
                            <button onClick={() => setShowColumnSettings(false)} className="text-gray-400 hover:text-gray-600">
                              <X size={14} />
                            </button>
                          </div>
                          {interview.custom_metrics.map((metric) => (
                            <label key={metric.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={visibleMetrics.includes(metric.id)}
                                onChange={() => toggleMetricVisibility(metric.id)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700 truncate">{metric.title}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 w-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Table - Scrollable */}
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 whitespace-nowrap">Candidate</th>
                        <th
                          className="text-left py-2 px-3 text-xs font-medium text-amber-600 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                          onClick={() => handleSort("weightedScore")}
                        >
                          <div className="flex items-center gap-1">
                            Weighted
                            {sortColumn === "weightedScore" && (
                              sortDirection === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left py-2 px-3 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                          onClick={() => handleSort("overallScore")}
                        >
                          <div className="flex items-center gap-1">
                            Overall
                            {sortColumn === "overallScore" && (
                              sortDirection === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                            )}
                          </div>
                        </th>
                        {/* Custom Metric Columns - hidden by default, animate in */}
                        {interview?.custom_metrics?.filter((m) => visibleMetrics.includes(m.id)).map((metric) => (
                          <th
                            key={metric.id}
                            className="text-left py-2 px-3 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 whitespace-nowrap animate-fadeIn"
                            onClick={() => handleSort(`metric_${metric.id}`)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[60px]">{metric.title}</span>
                              {sortColumn === `metric_${metric.id}` && (
                                sortDirection === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 w-full">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterMainResponses.length > 0 ? (
                        filterMainResponses.map((response, idx) => {
                          // Get the summary/analysis text from various possible fields
                          const summaryText = response?.analytics?.overallFeedback || 
                                             response?.analytics?.summary || 
                                             response?.details?.call_analysis?.call_summary ||
                                             "";
                          const hasCV = response?.cv_url || response?.details?.attached_cv;
                          return (
                            <tr
                              key={response.id}
                              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                idx % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"
                              }`}
                            >
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-1 h-6 rounded-full flex-shrink-0 ${
                                      response.candidate_status === "SELECTED"
                                        ? "bg-green-500"
                                        : response.candidate_status === "POTENTIAL"
                                        ? "bg-amber-500"
                                        : response.candidate_status === "NOT_SELECTED"
                                        ? "bg-red-500"
                                        : "bg-gray-300"
                                    }`}
                                  />
                                  <span
                                    className="text-sm font-medium text-gray-900 cursor-pointer hover:underline"
                                    onClick={() => {
                                      navigateWithTransition(`/interviews/${params.interviewId}?call=${response.call_id}`);
                                      handleResponseClick(response);
                                    }}
                                  >
                                    {response?.name || "Anonymous"}
                                  </span>
                                  {hasCV && (
                                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">+CV</span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/interviews/${params.interviewId}?call=${response.call_id}`, "_blank");
                                    }}
                                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                    title="Open in new tab"
                                  >
                                    <ExternalLink size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                                {response?.analytics?.weightedOverallScore ?? response?.analytics?.overallScore ?? "-"}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900 whitespace-nowrap">
                                {response?.analytics?.overallScore ?? "-"}
                              </td>
                              {/* Custom Metric Values - animate in with columns */}
                              {interview?.custom_metrics?.filter((m) => visibleMetrics.includes(m.id)).map((metric) => {
                                const metricScore = response?.analytics?.customMetrics?.find(
                                  (m: any) => m.metricId === metric.id
                                );
                                return (
                                  <td key={metric.id} className="py-2 px-3 text-xs text-gray-700 whitespace-nowrap animate-fadeIn">
                                    {metricScore?.score ?? "-"}
                                  </td>
                                );
                              })}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 line-clamp-1">
                                    {summaryText || "No summary available"}
                                  </span>
                                  {summaryText && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                                          <Info size={11} />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-sm p-3">
                                        <p className="text-xs whitespace-pre-wrap">{summaryText}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4 + (interview?.custom_metrics?.filter((m) => visibleMetrics.includes(m.id)).length || 0)} className="py-8 text-center text-gray-500">
                            No responses found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Charts Row */}
                <div className="flex gap-6 py-4 flex-shrink-0 border-t border-gray-100 mt-2">

                  {/* Sentiment Chart */}
                  <div className="flex-1 rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Candidate Sentiment</h3>
                      <Smile size={18} className="text-gray-400" />
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="relative w-24 h-24">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#F59E0B"
                            strokeWidth="4"
                            strokeDasharray={`${(sentimentCounts.positive / Math.max(totalResponses, 1)) * 88} 88`}
                            strokeLinecap="round"
                          />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#22C55E"
                            strokeWidth="4"
                            strokeDasharray={`${(sentimentCounts.neutral / Math.max(totalResponses, 1)) * 88} 88`}
                            strokeDashoffset={`-${(sentimentCounts.positive / Math.max(totalResponses, 1)) * 88}`}
                            strokeLinecap="round"
                          />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#EF4444"
                            strokeWidth="4"
                            strokeDasharray={`${(sentimentCounts.negative / Math.max(totalResponses, 1)) * 88} 88`}
                            strokeDashoffset={`-${((sentimentCounts.positive + sentimentCounts.neutral) / Math.max(totalResponses, 1)) * 88}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-sm text-gray-700">Positive</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{sentimentCounts.positive}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-gray-700">Neutral</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{sentimentCounts.neutral}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm text-gray-700">Negative</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{sentimentCounts.negative}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Chart */}
                  <div className="flex-1 rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Candidate Status</h3>
                      <UserCircle size={18} className="text-gray-400" />
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="relative w-24 h-24">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#22C55E"
                            strokeWidth="4"
                            strokeDasharray={`${(statusCounts.selected / Math.max(totalResponses, 1)) * 88} 88`}
                            strokeLinecap="round"
                          />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#F59E0B"
                            strokeWidth="4"
                            strokeDasharray={`${(statusCounts.potential / Math.max(totalResponses, 1)) * 88} 88`}
                            strokeDashoffset={`-${(statusCounts.selected / Math.max(totalResponses, 1)) * 88}`}
                            strokeLinecap="round"
                          />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#EF4444"
                            strokeWidth="4"
                            strokeDasharray={`${(statusCounts.notSelected / Math.max(totalResponses, 1)) * 88} 88`}
                            strokeDashoffset={`-${((statusCounts.selected + statusCounts.potential) / Math.max(totalResponses, 1)) * 88}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-sm text-gray-700">Selected</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{statusCounts.selected}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-sm text-gray-700">Potential</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{statusCounts.potential}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-sm text-gray-700">Not Selected</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{statusCounts.notSelected}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <span className="text-sm text-gray-700">No Status</span>
                          <span className="ml-auto text-sm font-semibold text-gray-900">{statusCounts.noStatus}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Right Sidebar */}
      <div className="w-[260px] border-l border-gray-200 flex flex-col bg-white flex-shrink-0 overflow-hidden">
        {/* Filter */}
        <div className="p-3 border-b border-gray-100 flex-shrink-0">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full rounded-lg border-gray-200 h-9">
              <Filter size={14} className="text-gray-400 mr-2" />
              <SelectValue placeholder="Filter By" />
              <ChevronDown size={14} className="ml-auto text-gray-400" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value={CandidateStatus.SELECTED}>Selected</SelectItem>
              <SelectItem value={CandidateStatus.POTENTIAL}>Potential</SelectItem>
              <SelectItem value={CandidateStatus.NOT_SELECTED}>Not Selected</SelectItem>
              <SelectItem value={CandidateStatus.NO_STATUS}>No Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex p-2 gap-2 flex-shrink-0">
          <button
            onClick={() => setSidebarTab("interviews")}
            className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
              sidebarTab === "interviews"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Interviews
          </button>
          <button
            onClick={() => setSidebarTab("cvs")}
            className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${
              sidebarTab === "cvs"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            CVs
          </button>
        </div>

        {/* Response List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-2 space-y-1.5">
            {filterSidebarResponses().length > 0 ? (
              filterSidebarResponses().map((response) => {
                const hasCV = response?.cv_url || response?.details?.attached_cv;
                const score = response?.analytics?.overallScore;
                // Score border color: green >= 80, yellow 50-79, grey < 50
                const scoreBorderColor = score >= 80 ? "border-green-500" : score >= 50 ? "border-amber-500" : "border-gray-400";
                const scoreTextColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-gray-500";
                return (
                  <div
                    key={response.id}
                    onClick={() => {
                      navigateWithTransition(`/interviews/${params.interviewId}?call=${response.call_id}`);
                      handleResponseClick(response);
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 cursor-pointer transition-all hover:shadow-sm hover:border-gray-200"
                  >
                    {/* Status indicator bar - reflects candidate status */}
                    <div
                      className={`w-1 h-9 rounded-full flex-shrink-0 ${
                        response.candidate_status === "SELECTED"
                          ? "bg-green-500"
                          : response.candidate_status === "POTENTIAL"
                          ? "bg-amber-500"
                          : response.candidate_status === "NOT_SELECTED"
                          ? "bg-red-500"
                          : "bg-gray-400"
                      }`}
                    />
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {response?.name ? `${response.name}'s Response` : "Response"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-gray-500">
                        <span className="flex items-center gap-0.5">
                          <Calendar size={8} />
                          {new Date(response?.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock size={8} />
                          {new Date(response?.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                        </span>
                      </div>
                    </div>
                    {/* +CV tag and Score badge - aligned right */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasCV && (
                        <span className="text-[8px] font-medium text-blue-600 bg-blue-50 px-1 py-0.5 rounded">+CV</span>
                      )}
                      <div className={`w-7 h-7 rounded-full border-2 ${scoreBorderColor} bg-white flex items-center justify-center`}>
                        <span className={`text-[9px] font-bold ${scoreTextColor}`}>
                          {score ?? "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-sm text-gray-500 py-6">No responses</p>
            )}
          </div>
        </div>

        {/* Sidebar Footer - Edit Interview button only */}
        <div className="p-2 border-t border-gray-100 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => navigateWithTransition(`/interviews/${params.interviewId}?edit=true`)}
          >
            <Pencil size={12} />
            Edit Interview
          </Button>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showColorPicker} closeOnOutsideClick={false} onClose={applyColorChange}>
        <div className="w-[250px] p-3">
          <h3 className="text-lg font-semibold mb-4 text-center">Choose a Theme Color</h3>
          <ChromePicker
            disableAlpha={true}
            color={themeColor}
            styles={{ default: { picker: { width: "100%" } } }}
            onChange={handleColorChange}
          />
        </div>
      </Modal>

      {isSharePopupOpen && (
        <SharePopup
          open={isSharePopupOpen}
          shareContent={
            interview?.readable_slug
              ? `${base_url}/call/${interview?.readable_slug}`
              : (interview?.url as string)
          }
          onClose={() => setIsSharePopupOpen(false)}
        />
      )}

      <Modal open={isCVUploaderOpen} closeOnOutsideClick={true} onClose={() => setIsCVUploaderOpen(false)}>
        <div className="w-[500px] p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Upload CVs</h3>
              <p className="text-sm text-gray-500">
                Upload candidate CVs to rank them against this interview&apos;s criteria
              </p>
            </div>
          </div>
          <CVUploader interviewId={params.interviewId} onUploadComplete={refreshResponses} />
        </div>
      </Modal>
      </div>
    </TooltipProvider>
  );
}

export default InterviewHome;
