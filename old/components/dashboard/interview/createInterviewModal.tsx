import React, { useEffect, useState, useCallback } from "react";
import LoaderWithLogo from "@/components/loaders/loader-with-logo/loaderWithLogo";
import DetailsPopup from "@/components/dashboard/interview/create-popup/details";
import CustomMetricsPopup from "@/components/dashboard/interview/create-popup/customMetrics";
import QuestionsPopup from "@/components/dashboard/interview/create-popup/questions";
import { InterviewBase } from "@/types/interview";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

// Flow: Details -> Loading -> Questions -> Metrics -> Save
type Step = "details" | "loading" | "questions" | "metrics";

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

  // Below for File Upload
  const [isUploaded, setIsUploaded] = useState(false);
  const [fileName, setFileName] = useState("");

  // Track when questions are ready
  const [questionsReady, setQuestionsReady] = useState(false);

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
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(null);
      setLogoFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDetailsComplete = useCallback(() => {
    setStep("loading");
  }, []);

  const handleSetInterviewData = useCallback((data: InterviewBase) => {
    setInterviewData(data);
    // If questions are set, mark as ready
    if (data.questions && data.questions.length > 0) {
      setQuestionsReady(true);
    }
  }, []);

  const handleQuestionsBack = () => {
    setStep("details");
  };

  const handleQuestionsNext = () => {
    setStep("metrics");
  };

  const handleMetricsBack = () => {
    setStep("questions");
  };

  return (
    <>
      {step === "loading" ? (
        <div className="w-full max-w-[38rem] min-w-[320px] h-[28rem] flex items-center justify-center">
          <LoaderWithLogo />
        </div>
      ) : step === "details" ? (
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
        />
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
    </>
  );
}

export default CreateInterviewModal;

