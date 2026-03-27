import React, { useState, useEffect } from "react";
import { useInterviewers } from "@/contexts/interviewers.context";
import { InterviewBase } from "@/types/interview";
import { Check, ChevronRight, Info, ListFilter } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import FileUpload from "../fileUpload";
import Modal from "@/components/dashboard/Modal";
import InterviewerDetailsModal from "@/components/dashboard/interviewer/interviewerDetailsModal";
import { Interviewer } from "@/types/interviewer";
import { useOrganization } from "@clerk/nextjs";

interface Props {
  open: boolean;
  setLoading: (loading: boolean) => void;
  interviewData: InterviewBase;
  setInterviewData: (interviewData: InterviewBase) => void;
  isUploaded: boolean;
  setIsUploaded: (isUploaded: boolean) => void;
  fileName: string;
  setFileName: (fileName: string) => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  logoPreview: string | null;
  setLogoPreview: (preview: string | null) => void;
  uploadedDocumentContext: string;
  setUploadedDocumentContext: (ctx: string) => void;
}

function DetailsPopup({
  open,
  setLoading,
  interviewData,
  setInterviewData,
  isUploaded,
  setIsUploaded,
  fileName,
  setFileName,
  logoFile,
  setLogoFile,
  logoPreview,
  setLogoPreview,
  uploadedDocumentContext,
  setUploadedDocumentContext,
}: Props) {
  const { interviewers } = useInterviewers();
  const { organization } = useOrganization();
  const [openInterviewerDetails, setOpenInterviewerDetails] = useState(false);
  const [interviewerDetails, setInterviewerDetails] = useState<Interviewer>();

  const [name, setName] = useState(interviewData.name);
  const [selectedInterviewer, setSelectedInterviewer] = useState(
    interviewData.interviewer_id,
  );
  const [objective, setObjective] = useState(interviewData.objective);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(
    interviewData.is_anonymous,
  );
  const [numQuestions, setNumQuestions] = useState(
    interviewData.question_count == 0
      ? ""
      : String(interviewData.question_count),
  );
  const [duration, setDuration] = useState(interviewData.time_duration);
  const [jobContext, setJobContext] = useState(interviewData.job_context || "");

  const slideRight = (id: string, value: number) => {
    var slider = document.getElementById(`${id}`);
    if (slider) {
      slider.scrollLeft = slider.scrollLeft + value;
    }
  };

  const onNext = () => {
    const updatedInterviewData: InterviewBase = {
      ...interviewData,
      name: name.trim(),
      objective: objective.trim(),
      interviewer_id: selectedInterviewer,
      question_count: Number(numQuestions),
      time_duration: String(duration),
      is_anonymous: isAnonymous,
      job_context: jobContext.trim(),
      logo_url: interviewData.logo_url ?? null,
    };
    setInterviewData(updatedInterviewData);
    setLoading(true);
  };

  useEffect(() => {
    if (!open) {
      setName("");
      setSelectedInterviewer(BigInt(0));
      setObjective("");
      setIsAnonymous(false);
      setNumQuestions("");
      setDuration("");
      setJobContext("");
    }
  }, [open]);

  useEffect(() => {
    if (!open && logoPreview && logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
  }, [logoPreview, open]);

  return (
    <>
      <div className="w-full rounded-3xl border border-gray-100 bg-white p-6">
        <h2 className="mb-6 text-sm font-semibold text-gray-900">
          Interview Details
        </h2>

        <div className="space-y-4">
          {/* Interview Name */}
          <div className="rounded-2xl border border-gray-200 px-4 py-3">
            <label className="text-xs text-gray-500">Interview Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => setName(e.target.value.trim())}
              placeholder="e.g Site Engineer"
              className="mt-1 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {/* Interview Logo */}
          {organization?.imageUrl && (
            <div className="rounded-2xl border border-gray-200 px-4 py-3">
              <label className="text-xs text-gray-500">Interview Logo</label>
              <div className="mt-3 flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={organization.imageUrl}
                    alt="Organization logo"
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Your organization logo will be used for this interview. You can upload a custom logo after creating the interview.
                </p>
              </div>
            </div>
          )}

          {/* Select an Interviewer */}
          <div className="rounded-2xl border border-gray-200 px-4 py-3 overflow-visible">
            <label className="text-xs text-gray-500">Select an Interviewer</label>
            <div className="relative mt-3 flex items-center">
              <div
                id="slider-3"
                className="flex-1 overflow-x-auto whitespace-nowrap scroll-smooth scrollbar-hide pb-5 pt-1"
              >
                <div className="inline-flex gap-4">
                  {interviewers.map((item) => (
                    <div
                      className="relative inline-flex flex-col items-center cursor-pointer"
                      key={item.id}
                    >
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 z-10 rounded-full bg-white p-0.5 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInterviewerDetails(item);
                          setOpenInterviewerDetails(true);
                        }}
                      >
                        <Info size={12} className="text-indigo-500" />
                      </button>

                      <div
                        className={`mx-auto h-14 w-14 overflow-hidden rounded-full transition-all ${
                          selectedInterviewer === item.id
                            ? "ring-2 ring-gray-900 ring-offset-2"
                            : "border border-gray-200"
                        }`}
                        onClick={() => setSelectedInterviewer(item.id)}
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-gray-700 w-16 text-center truncate">{item.name}</p>
                      <div className="h-4 flex items-center justify-center">
                        {selectedInterviewer === item.id && (
                          <Check size={12} className="text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {interviewers.length > 5 && (
                <button
                  type="button"
                  className="ml-2 flex-shrink-0 rounded-full p-1 hover:bg-gray-100"
                  onClick={() => slideRight("slider-3", 200)}
                >
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Objective */}
          <div className="rounded-2xl border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500">Objective</label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <ListFilter size={12} />
                Generate
              </button>
            </div>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onBlur={(e) => setObjective(e.target.value.trim())}
              placeholder="e.g Find the best candidates based on their technical skills and previous projects"
              rows={2}
              className="mt-2 w-full resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {/* Job Context */}
          <div className="rounded-2xl border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-500">Job Context</label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <ListFilter size={12} />
                Generate
              </button>
            </div>
            <textarea
              value={jobContext}
              onChange={(e) => setJobContext(e.target.value)}
              onBlur={(e) => setJobContext(e.target.value.trim())}
              placeholder="e.g Describe the role, required skills, company culture etc."
              rows={2}
              className="mt-2 w-full resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          {/* Upload Documents */}
          <div>
            <p className="mb-2 text-xs text-gray-500">
              Upload any documents related to the interview.
            </p>
            <div className="rounded-2xl border border-gray-200 px-4 py-6">
              <FileUpload
                isUploaded={isUploaded}
                setIsUploaded={setIsUploaded}
                fileName={fileName}
                setFileName={setFileName}
                setUploadedDocumentContext={setUploadedDocumentContext}
              />
            </div>
          </div>

          {/* Number of Questions & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 px-4 py-3">
              <label className="text-xs text-gray-500">Number of Questions</label>
              <div className="mt-1 flex items-center justify-between">
                <input
                  type="number"
                  step="1"
                  max="5"
                  min="1"
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
                      setNumQuestions(value);
                    }
                  }}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                <div className="flex flex-col text-gray-400">
                  <ChevronRight size={12} className="-mb-1 rotate-[-90deg]" />
                  <ChevronRight size={12} className="rotate-90" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 px-4 py-3">
              <label className="text-xs text-gray-500">Expected Duration (mins)</label>
              <div className="mt-1 flex items-center justify-between">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={duration}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (
                      value === "" ||
                      (Number.isInteger(Number(value)) && Number(value) > 0)
                    ) {
                      setDuration(value);
                    }
                  }}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                <div className="flex flex-col text-gray-400">
                  <ChevronRight size={12} className="-mb-1 rotate-[-90deg]" />
                  <ChevronRight size={12} className="rotate-90" />
                </div>
              </div>
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Do you prefer the interviewees&apos; responses to be anonymous?
              </p>
              <p className="mt-0.5 text-xs italic text-gray-500">
                Note: If not anonymous, the interviewee&apos;s email and name will be collected.
              </p>
            </div>
            <Switch
              checked={isAnonymous}
              className={isAnonymous ? "bg-gray-900" : "bg-gray-200"}
              onCheckedChange={(checked) => setIsAnonymous(checked)}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-lg border-gray-300 px-6 text-gray-700"
            disabled
          >
            Save as Draft
          </Button>
          <Button
            className="rounded-lg bg-gray-900 px-6 text-white hover:bg-gray-800"
            disabled={
              !(
                name.trim() &&
                objective.trim() &&
                numQuestions &&
                duration &&
                selectedInterviewer != BigInt(0)
              )
            }
            onClick={onNext}
          >
            Next Step
          </Button>
        </div>
      </div>

      <Modal
        open={openInterviewerDetails}
        closeOnOutsideClick={true}
        onClose={() => setOpenInterviewerDetails(false)}
      >
        <InterviewerDetailsModal interviewer={interviewerDetails} />
      </Modal>
    </>
  );
}

export default DetailsPopup;
