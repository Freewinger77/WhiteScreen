/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import DetailsPopup from "@/components/dashboard/interview/create-popup/details";
import CustomMetricsPopup from "@/components/dashboard/interview/create-popup/customMetrics";
import QuestionsPopup from "@/components/dashboard/interview/create-popup/questions";
import { InterviewBase } from "@/types/interview";
import { Loader2, Sparkles, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

// Flow: Details -> Select Depth -> (Loading) -> Questions -> Metrics -> Save
type Step = "details" | "selectDepth" | "loading" | "questions" | "metrics";

const CreateEmptyInterviewData = (): InterviewBase => ({
  user_id: "",
  organization_id: "",
  name: "",
  interviewer_id: BigInt(0),
  objective: "",
  question_count: 0,
  time_duration: "",
  is_anonymous: false,
  questions: [],
  description: "",
  response_count: BigInt(0),
  logo_url: null,
});

function CreateInterviewModal({ open, setOpen }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [interviewData, setInterviewData] = useState<InterviewBase>(
    CreateEmptyInterviewData(),
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadedDocumentContext, setUploadedDocumentContext] = useState("");

  // Below for File Upload
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState("");

  // Track when questions are ready
  const [questionsReady, setQuestionsReady] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Handle loading state transition - only move to questions when data is ready
  useEffect(() => {
    if (step === "loading" && questionsReady) {
      setStep("questions");
      setQuestionsReady(false);
    }
  }, [step, questionsReady]);

  // Watch for interview data changes during loading
  useEffect(() => {
    if (step === "loading" && interviewData.questions.length > 0) {
      setQuestionsReady(true);
    }
  }, [step, interviewData.questions.length]);

  useEffect(() => {
    if (!open) {
      setStep("details");
      setInterviewData(CreateEmptyInterviewData());
      setIsUploaded(false);
      setFileName("");
      setUploadedDocumentContext("");
      setGenerationError(null);
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
      setLogoFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDetailsComplete = useCallback(() => {
    setStep("selectDepth");
  }, []);

  const handleSetInterviewData = useCallback((data: InterviewBase) => {
    setInterviewData(data);
    // If questions are set, mark as ready
    if (data.questions && data.questions.length > 0) {
      setQuestionsReady(true);
    }
  }, []);

  const handleQuestionsBack = () => {
    setStep("selectDepth");
  };

  const handleQuestionsNext = () => {
    setStep("metrics");
  };

  const handleMetricsBack = () => {
    setStep("questions");
  };

  const activeTabIndex = useMemo(() => {
    if (step === "details") return 0;
    if (step === "selectDepth" || step === "loading" || step === "questions")
      return 1;
    if (step === "metrics") return 2;
    return 0;
  }, [step]);

  const handleGenerateQuestions = async () => {
    setGenerationError(null);
    setStep("loading");

    try {
      const data = {
        name: (interviewData.name || "").trim(),
        objective: (interviewData.objective || "").trim(),
        number: String(interviewData.question_count || ""),
        context: uploadedDocumentContext,
      };

      const generatedQuestions = (await axios.post(
        "/api/generate-interview-questions",
        data,
      )) as any;

      const generatedQuestionsResponse = JSON.parse(
        generatedQuestions?.data?.response,
      );

      const updatedQuestions = generatedQuestionsResponse.questions.map(
        (q: { question: string }) => ({
          id: uuidv4(),
          question: q.question.trim(),
          follow_up_count: 1,
        }),
      );

      handleSetInterviewData({
        ...interviewData,
        name: (interviewData.name || "").trim(),
        objective: (interviewData.objective || "").trim(),
        questions: updatedQuestions,
        description: (generatedQuestionsResponse.description || "").trim(),
      });
    } catch (e) {
      console.error("Error generating questions:", e);
      setGenerationError("Failed to generate questions. Please try again.");
      setStep("selectDepth");
    }
  };

  const handleManualQuestions = () => {
    setGenerationError(null);
    handleSetInterviewData({
      ...interviewData,
      questions:
        interviewData.questions?.length > 0
          ? interviewData.questions
          : [{ id: uuidv4(), question: "", follow_up_count: 1 }],
      description: (interviewData.description || "").trim(),
    });
    setStep("questions");
  };

  return (
    <div className="w-full pb-14">
      <div className="mx-auto w-full max-w-[1080px] px-8 pt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Create an Interview
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          {[
            "Interview Details",
            "Select Depth",
            "Custom Metrics",
            "Preview and Publish",
          ].map((label, idx) => {
            const isActive = idx === activeTabIndex;
            const isDisabled = idx === 3; // not implemented yet

            return (
              <button
                key={label}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (idx === 0) setStep("details");
                  if (idx === 1) setStep("selectDepth");
                  if (idx === 2) setStep("metrics");
                }}
                className={cn(
                  "relative pb-2 transition-colors",
                  isDisabled && "cursor-not-allowed opacity-60",
                  isActive ? "text-gray-900" : "hover:text-gray-700",
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-gray-900" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-gray-50/60 p-6">
          {step === "details" ? (
            <DetailsPopup
              open={open}
              setLoading={handleDetailsComplete}
              interviewData={interviewData}
              setInterviewData={handleSetInterviewData}
              isUploaded={isUploaded}
              setIsUploaded={setIsUploaded}
              fileName={fileName}
              setFileName={setFileName}
              logoFile={logoFile}
              setLogoFile={setLogoFile}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
              uploadedDocumentContext={uploadedDocumentContext}
              setUploadedDocumentContext={setUploadedDocumentContext}
            />
          ) : step === "selectDepth" ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGenerateQuestions}
                  className="group flex h-28 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 text-gray-900 transition-all hover:border-indigo-300 hover:bg-indigo-50/70"
                >
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <span className="font-medium">Generate Questions</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualQuestions}
                  className="group flex h-28 items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white text-gray-900 transition-all hover:border-gray-400"
                >
                  <PencilLine className="h-5 w-5 text-gray-700" />
                  <span className="font-medium">I&apos;ll do it myself</span>
                </button>
              </div>

              {generationError && (
                <p className="mt-4 text-center text-sm text-red-600">
                  {generationError}
                </p>
              )}
            </div>
          ) : step === "loading" ? (
            <div className="flex min-h-[520px] items-center justify-center rounded-2xl bg-white shadow-sm">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-300" />
            </div>
          ) : step === "questions" ? (
            <QuestionsPopup
              interviewData={interviewData}
              setInterviewData={setInterviewData}
              logoFile={logoFile}
              onBack={handleQuestionsBack}
              onNext={handleQuestionsNext}
            />
          ) : (
            <CustomMetricsPopup
              interviewData={interviewData}
              setInterviewData={setInterviewData}
              logoFile={logoFile}
              onBack={handleMetricsBack}
              setOpen={setOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateInterviewModal;

