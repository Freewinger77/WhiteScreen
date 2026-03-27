"use client";

import React, { useEffect, useState } from "react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useInterviews } from "@/contexts/interviews.context";
import { ChevronRight, LayoutGrid } from "lucide-react";
import { ResponseService } from "@/services/responses.service";
import { usePageTransition } from "@/components/PageTransition";

function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { interviews } = useInterviews();
  const [candidateName, setCandidateName] = useState<string>("");
  const { navigateWithTransition } = usePageTransition();
  
  // Check if we're on an interview page
  const isInterviewPage = pathname?.includes("/interviews/");
  const interviewId = isInterviewPage ? pathname.split("/interviews/")[1]?.split("?")[0] : null;
  const currentInterview = interviewId ? interviews?.find((i) => i.id === interviewId) : null;
  
  // Check if we're viewing a specific candidate report
  const callId = searchParams?.get("call");
  const isViewingReport = isInterviewPage && callId;
  
  // Check if we're on the main dashboard
  const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/";

  // Fetch candidate name when viewing a report
  useEffect(() => {
    const fetchCandidateName = async () => {
      if (callId) {
        try {
          const response = await ResponseService.getResponseByCallId(callId);
          if (response?.name) {
            setCandidateName(response.name);
          }
        } catch (error) {
          console.error("Error fetching candidate name:", error);
        }
      } else {
        setCandidateName("");
      }
    };

    fetchCandidateName();
  }, [callId]);

  return (
    <header className="fixed top-0 right-0 left-[212px] z-[20] h-[68px] border-b-[0.5px] border-black/10 bg-white">
      <div className="flex h-full items-center justify-between gap-6 px-[28px]">
        <div className="flex items-center gap-3">
          {isDashboard ? (
            // Main dashboard - show org switcher
            <>
              <button 
                onClick={() => navigateWithTransition("/dashboard")} 
                className="flex items-center gap-2"
              >
                <p className="text-sm font-semibold text-gray-900">Dashboard</p>
              </button>
              <div className="h-5 w-px bg-black/10" />
              <OrganizationSwitcher
                hidePersonal={true}
                appearance={{
                  variables: {
                    fontSize: "0.9rem",
                  },
                }}
              />
            </>
          ) : isInterviewPage ? (
            // Interview page - show breadcrumb
            <>
              <LayoutGrid size={16} className="text-gray-400" />
              <button 
                onClick={() => navigateWithTransition("/dashboard")} 
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Interviews
              </button>
              <ChevronRight size={14} className="text-gray-400" />
              {isViewingReport ? (
                // Viewing a candidate report - interview name is clickable
                <>
                  <button 
                    onClick={() => navigateWithTransition(`/interviews/${interviewId}`)}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {currentInterview?.name || "Interview"}
                  </button>
                  <ChevronRight size={14} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {candidateName || "Candidate"}
                  </span>
                </>
              ) : (
                // Just viewing interview summary
                <span className="text-sm font-medium text-gray-900">
                  {currentInterview?.name || "Interview"}
                </span>
              )}
            </>
          ) : (
            // Other pages
            <button 
              onClick={() => navigateWithTransition("/dashboard")} 
              className="flex items-center gap-2"
            >
              <p className="text-sm font-semibold text-gray-900">Dashboard</p>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" signInUrl="/sign-in" />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
