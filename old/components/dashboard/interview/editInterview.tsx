"use client";

import { Interview, Question, CustomMetric } from "@/types/interview";
import React, { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus, SaveIcon, TrashIcon, RefreshCw, Scale, Info, FileText, Settings, HelpCircle } from "lucide-react";
import { useInterviewers } from "@/contexts/interviewers.context";
import QuestionCard from "@/components/dashboard/interview/create-popup/questionCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useInterviews } from "@/contexts/interviews.context";
import { InterviewService } from "@/services/interviews.service";
import { CardTitle } from "../../ui/card";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { useOrganization } from "@clerk/nextjs";
import CustomMetricsEditor from "./customMetricsEditor";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

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
  
  // Calculate total weight for validation
  const totalWeight = customMetrics.reduce((sum, m) => sum + m.weight, 0);
  const weightsValid = customMetrics.length === 0 || totalWeight === 10;
  const metricsHaveContent = customMetrics.every(m => m.title.trim() !== "" && m.description.trim() !== "");

  const endOfListRef = useRef<HTMLDivElement>(null);
  const prevQuestionLengthRef = useRef(questions.length);
  const router = useRouter();

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
      router.push(`/interviews/${interview?.id}`);
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
      router.push("/dashboard");
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
    <div className="h-screen z-[10] mx-2 overflow-hidden">
      <div className="flex flex-col bg-gray-200 rounded-md h-full p-2 pl-4">
        {/* Header */}
        <div className="flex flex-row justify-between items-center border-b border-gray-300 pb-3">
          <div
            className="mt-2 ml-1 pr-2 inline-flex items-center text-orange-600 hover:cursor-pointer"
            onClick={() => {
              router.push(`/interviews/${interview?.id}`);
            }}
          >
            <ArrowLeft className="mr-2" />
            <p className="text-sm font-semibold">Back to Summary</p>
          </div>
          
          <div className="flex flex-row gap-3 items-center">
            {/* Validation warning */}
            {customMetrics.length > 0 && (!weightsValid || !metricsHaveContent) && (
              <span className="text-xs text-red-600 bg-red-100 px-3 py-1 rounded-full">
                {!weightsValid ? `Weights must sum to 10 (current: ${totalWeight})` : "Fill all metric fields"}
              </span>
            )}
            
            {/* Re-evaluate button - always visible when custom metrics exist */}
            {customMetrics.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      disabled={isClicked || isReEvaluating || !weightsValid || !metricsHaveContent}
                      className="bg-indigo-600 hover:bg-indigo-800"
                      onClick={() => {
                        setIsClicked(true);
                        onSave(true);
                      }}
                    >
                      {isReEvaluating ? (
                        <>
                          <RefreshCw size={16} className="mr-2 animate-spin" />
                          Re-evaluating...
                        </>
                      ) : (
                        <>
                          Save & Re-evaluate <RefreshCw size={16} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-700 text-white max-w-xs">
                    <p>Save changes and re-evaluate all existing responses with the custom metrics.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      disabled={isClicked || isReEvaluating || (customMetrics.length > 0 && (!weightsValid || !metricsHaveContent))}
                      className="bg-orange-600 hover:bg-orange-800"
                      onClick={() => {
                        setIsClicked(true);
                        onSave(false);
                      }}
                    >
                      Save <SaveIcon size={16} className="ml-2" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {customMetrics.length > 0 && (!weightsValid || !metricsHaveContent) && (
                  <TooltipContent className="bg-red-600 text-white max-w-xs">
                    <p>{!weightsValid ? `Metric weights must sum to 10 (current: ${totalWeight})` : "Fill all metric titles and descriptions"}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <AlertDialog>
              <AlertDialogTrigger>
                <Button
                  disabled={isClicked}
                  className="bg-red-500 hover:bg-red-600 p-2"
                >
                  <TrashIcon size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    this interview.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-orange-600 hover:bg-orange-800"
                    onClick={async () => {
                      await onDeleteInterviewClick();
                    }}
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4 overflow-hidden">
          <TabsList className="grid w-fit grid-cols-3 bg-slate-300">
            <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Settings size={16} />
              Details
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2 data-[state=active]:bg-white">
              <HelpCircle size={16} />
              Questions
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2 data-[state=active]:bg-white">
              <Scale size={16} />
              Custom Metrics
              {metricsChanged && (
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-auto mt-4 pr-4 animate-fadeIn">
            <div className="space-y-4">
              <div>
                <p className="mb-1 font-medium">
                  Interview Description{" "}
                  <span className="text-xs ml-2 font-normal text-gray-500">
                    (Your respondents will see this.)
                  </span>
                </p>
                <textarea
                  value={description}
                  className="h-fit py-2 border-2 rounded-md w-full px-2 border-gray-400 bg-white"
                  placeholder="Enter your interview description here."
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={(e) => setDescription(e.target.value.trim())}
                />
              </div>

              <div>
                <p className="mb-1 font-medium">Objective</p>
                <textarea
                  value={objective}
                  className="h-fit py-2 border-2 rounded-md w-full px-2 border-gray-400 bg-white"
                  placeholder="Enter your interview objective here."
                  rows={3}
                  onChange={(e) => setObjective(e.target.value)}
                  onBlur={(e) => setObjective(e.target.value.trim())}
                />
              </div>

              <div className="flex flex-row gap-6">
                <div className="flex-1">
                  <p className="mb-1 font-medium">Interviewer</p>
                  <div className="flex items-center">
                    <div
                      id="slider-3"
                      className="h-32 pt-1 overflow-x-scroll scroll whitespace-nowrap scroll-smooth scrollbar-hide"
                    >
                      {interviewers.map((item) => (
                        <div
                          className="p-0 inline-block cursor-pointer hover:scale-105 ease-in-out duration-300 ml-1 mr-3 rounded-xl shrink-0 overflow-hidden"
                          key={item.id}
                        >
                          <div
                            className={`w-[80px] overflow-hidden rounded-full ${
                              selectedInterviewer === item.id
                                ? "border-4 border-indigo-600"
                                : ""
                            }`}
                            onClick={() => setSelectedInterviewer(item.id)}
                          >
                            <Image
                              src={item.image}
                              alt="Picture of the interviewer"
                              width={70}
                              height={70}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardTitle className="mt-0 text-xs text-center">
                            {item.name}
                          </CardTitle>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-48">
                  <p className="mb-1 font-medium">Interview Logo</p>
                  <span className="text-xs text-gray-500 block mb-2">
                    Using organization logo
                  </span>
                  {organization?.imageUrl && (
                    <div className="h-16 w-16 rounded-xl border border-gray-200 flex items-center justify-center bg-white overflow-hidden">
                      <Image
                        src={organization.imageUrl}
                        alt="Organization logo"
                        width={64}
                        height={64}
                        className="object-contain h-full w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <label className="flex-col w-full">
                <div className="flex items-center cursor-pointer">
                  <span className="text-sm font-medium">
                    Do you prefer the interviewees&apos; responses to be anonymous?
                  </span>
                  <Switch
                    checked={isAnonymous}
                    className={`ml-4 border-2 border-gray-300 ${
                      isAnonymous ? "bg-orange-600" : "bg-white"
                    }`}
                    onCheckedChange={(checked) => setIsAnonymous(checked)}
                  />
                </div>
                <span className="text-xs text-gray-500 italic">
                  Note: If not anonymous, the interviewee&apos;s email and name will be collected.
                </span>
              </label>

              <div className="flex flex-row gap-8">
                <div className="flex flex-row items-center">
                  <h3 className="font-medium">No. of Questions:</h3>
                  <input
                    type="number"
                    step="1"
                    max="5"
                    min={questions.length.toString()}
                    className="border-2 text-center focus:outline-none bg-white rounded-md border-gray-400 w-14 px-2 py-0.5 ml-3"
                    value={numQuestions}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (
                        value === "" ||
                        (Number.isInteger(Number(value)) && Number(value) > 0)
                      ) {
                        if (Number(value) > 5) {
                          value = "5";
                        }
                        setNumQuestions(Number(value));
                      }
                    }}
                  />
                </div>
                <div className="flex flex-row items-center">
                  <h3 className="font-medium">Expected Duration (mins):</h3>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="border-2 text-center focus:outline-none bg-white rounded-md border-gray-400 w-14 px-2 py-0.5 ml-3"
                    value={Number(duration)}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (
                        value === "" ||
                        (Number.isInteger(Number(value)) && Number(value) > 0)
                      ) {
                        setDuration(Number(value));
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="flex-1 overflow-hidden mt-4 animate-fadeIn">
            <div className="h-full flex flex-col">
              <p className="mb-2 font-medium">Interview Questions</p>
              <ScrollArea className="flex-1 p-3 bg-slate-100 rounded-md">
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
                  <div
                    className="border-indigo-600 opacity-75 hover:opacity-100 w-fit text-center rounded-full mx-auto cursor-pointer"
                    onClick={handleAddQuestion}
                  >
                    <Plus
                      size={45}
                      strokeWidth={2.2}
                      className="text-orange-600 text-center"
                    />
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Custom Metrics Tab */}
          <TabsContent value="metrics" className="flex-1 overflow-hidden mt-4 animate-fadeIn">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-indigo-600" />
                  <p className="font-medium">Custom Evaluation Metrics</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-gray-700 text-white p-3">
                        <p className="text-sm">
                          Define custom metrics to evaluate candidates. Each metric has a weight 
                          (0-10) that determines its importance. Weights should sum to 10.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {metricsChanged && (
                  <span className="text-xs text-amber-600 font-medium bg-amber-100 px-3 py-1 rounded-full">
                    Metrics changed - save to apply
                  </span>
                )}
              </div>

              <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 overflow-hidden">
                <ScrollArea className="h-full">
                  <CustomMetricsEditor
                    metrics={customMetrics}
                    onChange={handleCustomMetricsChange}
                  />
                </ScrollArea>
              </div>

              {customMetrics.length > 0 && metricsChanged && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-sm text-indigo-700">
                    <strong>Note:</strong> After saving, you can use &quot;Save & Re-evaluate&quot; to 
                    apply these new metrics to all existing candidate responses.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default EditInterview;
