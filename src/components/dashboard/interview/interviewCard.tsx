"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy, CopyCheck, Loader2 } from "lucide-react";
import { ResponseService } from "@/services/responses.service";
import axios from "axios";
import { InterviewerService } from "@/services/interviewers.service";
import { usePageTransition } from "@/components/PageTransition";

interface Props {
  name: string | null;
  interviewerId: bigint;
  id: string;
  url: string;
  readableSlug: string;
}

const base_url = process.env.NEXT_PUBLIC_LIVE_URL;

// Skeleton loader for interview card
function InterviewCardSkeleton() {
  return (
    <div className="w-[250px] min-w-[200px] max-w-[272px] h-[250px] bg-[#F9F9FA] rounded-[20px] shrink-0 overflow-hidden animate-pulse">
      <div className="h-full flex flex-col">
        {/* Title Area Skeleton */}
        <div className="relative flex-1 flex items-center justify-center bg-gray-200/50 m-3 mb-0 rounded-[16px]">
          <div className="h-4 w-32 bg-gray-300 rounded" />
          <div className="absolute right-3 top-3">
            <div className="h-7 w-7 bg-gray-300 rounded-md" />
          </div>
        </div>
        {/* Footer Skeleton */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="h-10 w-10 bg-gray-300 rounded-full" />
          <div className="h-4 w-24 bg-gray-300 rounded" />
        </div>
      </div>
    </div>
  );
}

function InterviewCard({ name, interviewerId, id, url, readableSlug }: Props) {
  const [copied, setCopied] = useState(false);
  const [responseCount, setResponseCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [img, setImg] = useState("");
  const { navigateWithTransition } = usePageTransition();

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer =
        await InterviewerService.getInterviewer(interviewerId);
      setImg(interviewer.image);
    };
    fetchInterviewer();
  }, [interviewerId]);

  useEffect(() => {
    const fetchResponses = async () => {
      setIsLoading(true);
      try {
        const responses = await ResponseService.getAllResponses(id);
        setResponseCount(responses.length);
        setIsLoading(false);
        
        // Check for unanalyzed responses
        const unanalyzed = responses.filter(r => !r.is_analysed);
        if (unanalyzed.length > 0) {
          setIsAnalyzing(true);
          setAnalyzeProgress({ current: 0, total: unanalyzed.length });
          
          for (let i = 0; i < unanalyzed.length; i++) {
            const response = unanalyzed[i];
            setAnalyzeProgress({ current: i + 1, total: unanalyzed.length });
            try {
              const result = await axios.post("/api/get-call", {
                id: response.call_id,
              });
              if (result.status !== 200) {
                throw new Error(`HTTP error! status: ${result.status}`);
              }
            } catch (error) {
              console.error(
                `Failed to call api/get-call for response id ${response.call_id}:`,
                error,
              );
            }
          }
          setIsAnalyzing(false);
        }
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };

    fetchResponses();
  }, [id]);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(
        readableSlug ? `${base_url}/call/${readableSlug}` : (url as string),
      )
      .then(
        () => {
          setCopied(true);
          toast.success(
            "The link to your interview has been copied to your clipboard.",
            {
              position: "bottom-right",
              duration: 3000,
            },
          );
          setTimeout(() => {
            setCopied(false);
          }, 2000);
        },
        (err) => {
          console.log("failed to copy", err.mesage);
        },
      );
  };

  // Show skeleton while loading initial data
  if (isLoading) {
    return <InterviewCardSkeleton />;
  }

  return (
    <div
      onClick={() => {
        if (!isAnalyzing) {
          navigateWithTransition(`/interviews/${id}`);
        }
      }}
      style={{
        pointerEvents: isAnalyzing ? "none" : "auto",
        cursor: isAnalyzing ? "default" : "pointer",
      }}
      className="relative w-[250px] min-w-[200px] max-w-[272px] h-[250px] bg-[#F9F9FA] rounded-[20px] shrink-0 overflow-hidden transition-all duration-300 ease-out hover:shadow-md"
    >
      {/* Analysis Overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-[20px]">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-xs font-medium text-gray-700">Analyzing responses...</p>
          <p className="text-[10px] text-gray-500 mt-1">
            {analyzeProgress.current} of {analyzeProgress.total}
          </p>
        </div>
      )}

      <div className="h-full flex flex-col">
        {/* Title Area */}
        <div className="relative flex-1 flex items-center justify-center bg-indigo-50/70 m-3 mb-0 rounded-[16px]">
          <p className="mx-6 text-center text-sm font-semibold text-gray-900">
            {name}
          </p>

          {/* Copy Button */}
          <div className="absolute right-3 top-3">
            <Button
              className={`h-7 w-7 rounded-md p-0 ${
                copied 
                  ? "bg-indigo-600 text-white" 
                  : "bg-white/80 text-gray-600 hover:bg-white"
              }`}
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                copyToClipboard();
              }}
            >
              {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white shadow-sm">
              {img ? (
                <Image
                  src={img}
                  alt="Picture of the interviewer"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-200 animate-pulse" />
              )}
            </div>
          </div>

          <div className="text-sm text-gray-700">
            Responses:{" "}
            <span className="font-semibold text-gray-900">
              {responseCount?.toString() || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export skeleton for use in parent components
export { InterviewCardSkeleton };

export default InterviewCard;
