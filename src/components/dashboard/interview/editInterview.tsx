"use client";

import { Interview, Question, CustomMetric } from "@/types/interview";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus, Save, Trash2, RefreshCw, Scale, Info, Settings, HelpCircle, Check } from "lucide-react";
import { useInterviewers } from "@/contexts/interviewers.context";
import QuestionCard from "@/components/dashboard/interview/create-popup/questionCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useInterviews } from "@/contexts/interviews.context";
import { InterviewService } from "@/services/interviews.service";
import Image from "next/image";
import { toast } from "sonner";
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
import axios from "axios";
import { useOrganization } from "@clerk/nextjs";
import CustomMetricsEditor from "./customMetricsEditor";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { usePageTransition } from "@/components/PageTransition";

type EditInterviewProps = {
  interview: Interview | undefined;
};

function EditInterview({ interview }: EditInterviewProps) {
  const { interviewers } = useInterviewers();
  const { fetchInterviews } = useInterviews();
  const { organization } = useOrganization();

  const [description, setDescription] = useState<string>(
    interview?.description || "",
  );
  const [objective, setObjective] = useState<string>(
    interview?.objective || "",
  );
  const [numQuestions, setNumQuestions] = useState<number>(
    interview?.question_count || 1,
  );
  const [duration, setDuration] = useState<Number>(
    Number(interview?.time_duration),
  );
  const [questions, setQuestions] = useState<Question[]>(
    interview?.questions || [],
  );
  const [selectedInterviewer, setSelectedInterviewer] = useState(
    interview?.interviewer_id,
  );
  const [isAnonymous, setIsAnonymous] = useState<boolean>(
    interview?.is_anonymous || false,
  );
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>(
    interview?.custom_metrics || []
  );
  const [metricsChanged, setMetricsChanged] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const [isClicked, setIsClicked] = useState(false);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Calculate total weight for validation
  const totalWeight = customMetrics.reduce((sum, m) => sum + m.weight, 0);
  const weightsValid = customMetrics.length === 0 || totalWeight === 10;
  const metricsHaveContent = customMetrics.every(m => m.title.trim() !== "" && m.description.trim() !== "");

  const endOfListRef = useRef<HTMLDivElement>(null);
  const prevQuestionLengthRef = useRef(questions.length);
  const { navigateWithTransition } = usePageTransition();

  const handleInputChange = (id: string, newQuestion: Question) => {
    setQuestions(
      questions.map((question) =>
        question.id === id ? { ...question, ...newQuestion } : question,
      ),
    );
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length === 1) {
      setQuestions(
        questions.map((question) => ({
          ...question,
          question: "",
          follow_up_count: 1,
        })),
      );

      return;
    }
    setQuestions(questions.filter((question) => question.id !== id));
    setNumQuestions(numQuestions - 1);
  };

  const handleAddQuestion = () => {
    if (questions.length < numQuestions) {
      setQuestions([
        ...questions,
        { id: uuidv4(), question: "", follow_up_count: 1 },
      ]);
    }
  };

  const handleCustomMetricsChange = (newMetrics: CustomMetric[]) => {
    setCustomMetrics(newMetrics);
    // Check if metrics actually changed compared to original
    const originalMetricsStr = JSON.stringify(interview?.custom_metrics || []);
    const newMetricsStr = JSON.stringify(newMetrics);
    setMetricsChanged(originalMetricsStr !== newMetricsStr);
  };

  const reEvaluateResponses = async () => {
    if (!interview) return;
    
    setIsReEvaluating(true);
    try {
      const response = await axios.post("/api/reevaluate-responses", {
        interviewId: interview.id,
      });
      
      if (response.status === 200) {
        toast.success(`Re-evaluated ${response.data.results?.length || 0} responses with new metrics.`, {
          position: "bottom-right",
          duration: 4000,
        });
        setMetricsChanged(false);
      }
    } catch (error) {
      console.error("Error re-evaluating responses:", error);
      toast.error("Failed to re-evaluate responses. Please try again.", {
        position: "bottom-right",
        duration: 3000,
      });
    } finally {
      setIsReEvaluating(false);
    }
  };

  const onSave = async (shouldReEvaluate: boolean = false) => {
    const questionCount =
      questions.length < numQuestions ? questions.length : numQuestions;

    const interviewData = {
      objective: objective,
      questions: questions,
      interviewer_id: Number(selectedInterviewer),
      question_count: questionCount,
      time_duration: Number(duration),
      description: description,
      is_anonymous: isAnonymous,
      logo_url: organization?.imageUrl || null,
      custom_metrics: customMetrics.length > 0 ? customMetrics : null,
    } as any;

    try {
      if (!interview) {
        return;
      }

      const response = await axios.put(`/api/interviews/${interview.id}`, interviewData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200) {
        throw new Error("Failed to update interview");
      }

      // Re-evaluate if metrics changed and user requested it
      if (shouldReEvaluate && metricsChanged) {
        await reEvaluateResponses();
      }

      setIsClicked(false);
      fetchInterviews();
      toast.success("Interview updated successfully.", {
        position: "bottom-right",
        duration: 3000,
      });
      navigateWithTransition(`/interviews/${interview?.id}`);
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to update interview. Please try again.", {
        position: "bottom-right",
        duration: 3000,
      });
      setIsClicked(false);
    }
  };

  const onDeleteInterviewClick = async () => {
    if (!interview) {
      return;
    }

    try {
      await InterviewService.deleteInterview(interview.id);
      navigateWithTransition("/dashboard");
    } catch (error) {
      console.error("Error deleting interview:", error);
      toast.error("Failed to delete the interview.", {
        position: "bottom-right",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    if (questions.length > prevQuestionLengthRef.current) {
      endOfListRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevQuestionLengthRef.current = questions.length;
  }, [questions.length]);

  return (
    <TooltipProvider>
      <div className={`h-full w-full bg-white overflow-hidden transition-opacity duration-300 ${isNavigating ? "opacity-0" : "opacity-100 animate-fadeIn"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 relative z-10">
          <button
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isNavigating}
            onClick={() => {
              setIsNavigating(true);
              navigateWithTransition(`/interviews/${interview?.id}`);
            }}
          >
            {isNavigating ? "Redirecting..." : "Discard Changes"}
          </button>
          
          <div className="flex items-center gap-2">
            {/* Validation warning */}
            {customMetrics.length > 0 && (!weightsValid || !metricsHaveContent) && (
              <span className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                {!weightsValid ? `Weights must sum to 10 (current: ${totalWeight})` : "Fill all metric fields"}
              </span>
            )}
            
            {/* Re-evaluate button - purple gradient */}
            {customMetrics.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isClicked || isReEvaluating || !weightsValid || !metricsHaveContent || isNavigating}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white text-xs gap-2 border-0"
                    onClick={async () => {
                      setIsClicked(true);
                      await onSave(true);
                      setIsNavigating(true);
                      navigateWithTransition(`/interviews/${interview?.id}`);
                    }}
                  >
                    {isReEvaluating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Re-evaluating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        Save & Re-evaluate
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs z-50">
                  <p className="text-xs">Save changes and re-evaluate all existing responses with the custom metrics.</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Save button - outline style */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isClicked || isReEvaluating || isNavigating || (customMetrics.length > 0 && (!weightsValid || !metricsHaveContent))}
                  className="text-gray-700 border-gray-300 hover:bg-gray-50 text-xs gap-2"
                  onClick={async () => {
                    setIsClicked(true);
                    await onSave(false);
                    setIsNavigating(true);
                    navigateWithTransition(`/interviews/${interview?.id}`);
                  }}
                >
                  <Save size={14} />
                  Save
                </Button>
              </TooltipTrigger>
              {customMetrics.length > 0 && (!weightsValid || !metricsHaveContent) && (
                <TooltipContent side="bottom" className="bg-red-600 text-white max-w-xs z-50">
                  <p className="text-xs">{!weightsValid ? `Weights must sum to 10 (current: ${totalWeight})` : "Fill all fields"}</p>
                </TooltipContent>
              )}
            </Tooltip>
            
            {/* Delete button */}
            <AlertDialog onOpenChange={(open) => { if (!open) { setDeleteConfirmName(""); } }}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isClicked || isNavigating}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">Delete Interview</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action is <strong>irreversible</strong>. This will permanently delete this interview
                      and all its responses.
                    </p>
                    <p className="text-sm">
                      To confirm, please type <strong className="text-gray-900">{interview?.name}</strong> below:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder="Type interview name here..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={deleteConfirmName !== interview?.name}
                    onClick={async (e) => {
                      if (deleteConfirmName !== interview?.name) {
                        e.preventDefault();
                        return;
                      }
                      await onDeleteInterviewClick();
                    }}
                  >
                    Delete Interview
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100">
          {[
            { id: "details", label: "Details", icon: Settings },
            { id: "questions", label: "Questions", icon: HelpCircle },
            { id: "metrics", label: "Custom Metrics", icon: Scale },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === "metrics" && metricsChanged && (
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6" style={{ height: "calc(100% - 130px)" }}>
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="max-w-3xl space-y-6 animate-fadeIn">
              {/* Description */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  Interview Description
                  <span className="text-gray-400 font-normal ml-2">(visible to respondents)</span>
                </label>
                <textarea
                  value={description}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
                  placeholder="Describe what this interview is about..."
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={(e) => setDescription(e.target.value.trim())}
                />
              </div>

              {/* Objective */}
              <div className="rounded-2xl border border-gray-200 p-5">
                <label className="block text-xs font-medium text-gray-500 mb-2">Objective</label>
                <textarea
                  value={objective}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
                  placeholder="What are you trying to evaluate?"
                  rows={3}
                  onChange={(e) => setObjective(e.target.value)}
                  onBlur={(e) => setObjective(e.target.value.trim())}
                />
              </div>

              {/* Interviewer Selection */}
              <div className="rounded-2xl border border-gray-200 p-5 overflow-visible">
                <label className="block text-xs font-medium text-gray-500 mb-3">Select Interviewer</label>
                <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
                  {interviewers.map((item) => (
                    <div
                      key={item.id}
                      className={`flex flex-col items-center gap-1 cursor-pointer transition-all flex-shrink-0 ${
                        selectedInterviewer === item.id ? "" : "opacity-70 hover:opacity-100"
                      }`}
                      onClick={() => setSelectedInterviewer(item.id)}
                    >
                      <div
                        className={`w-14 h-14 rounded-full overflow-hidden transition-all ${
                          selectedInterviewer === item.id
                            ? "ring-2 ring-gray-900 ring-offset-2"
                            : "border border-gray-200"
                        }`}
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-gray-600 text-center w-16 truncate">{item.name}</span>
                      <div className="h-4 flex items-center justify-center">
                        {selectedInterviewer === item.id && (
                          <Check size={12} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Questions & Duration */}
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-medium text-gray-500">Number of Questions</label>
                    <input
                      type="number"
                      step="1"
                      max="5"
                      min={questions.length.toString()}
                      className="w-16 text-center text-sm font-medium bg-gray-50 rounded-lg border-0 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      value={numQuestions}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value === "" || (Number.isInteger(Number(value)) && Number(value) > 0)) {
                          if (Number(value) > 5) { value = "5"; }
                          setNumQuestions(Number(value));
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-500">Duration (minutes)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="w-16 text-center text-sm font-medium bg-gray-50 rounded-lg border-0 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      value={Number(duration)}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value === "" || (Number.isInteger(Number(value)) && Number(value) > 0)) {
                          setDuration(Number(value));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Anonymous Toggle & Logo */}
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-medium text-gray-500">Anonymous Responses</label>
                    <Switch
                      checked={isAnonymous}
                      onCheckedChange={setIsAnonymous}
                      className={isAnonymous ? "bg-gray-900" : ""}
                    />
                  </div>
                  {organization?.imageUrl && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden bg-white">
                        <Image
                          src={organization.imageUrl}
                          alt="Logo"
                          width={40}
                          height={40}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-xs text-gray-500">Organization logo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === "questions" && (
            <div className="max-w-3xl animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Interview Questions</h3>
                <span className="text-xs text-gray-500">{questions.length} / {numQuestions} questions</span>
              </div>
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    questionNumber={index + 1}
                    questionData={question}
                    onDelete={handleDeleteQuestion}
                    onQuestionChange={handleInputChange}
                  />
                ))}
                <div ref={endOfListRef} />
                {questions.length < numQuestions && (
                  <button
                    onClick={handleAddQuestion}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    <span className="text-sm">Add Question</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Custom Metrics Tab */}
          {activeTab === "metrics" && (
            <div className="max-w-3xl animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale size={16} className="text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-900">Custom Evaluation Metrics</h3>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info size={14} className="text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Define custom metrics to evaluate candidates. Weights should sum to 10.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {metricsChanged && (
                  <span className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-lg">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <CustomMetricsEditor
                  metrics={customMetrics}
                  onChange={handleCustomMetricsChange}
                />
              </div>

              {customMetrics.length > 0 && metricsChanged && (
                <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-gray-600">
                    <strong>Tip:</strong> Use &quot;Save & Re-evaluate&quot; to apply these metrics to all existing responses.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default EditInterview;
