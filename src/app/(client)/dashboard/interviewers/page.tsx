"use client";

import { useInterviewers } from "@/contexts/interviewers.context";
import React from "react";
import InterviewerCard from "@/components/dashboard/interviewer/interviewerCard";
import { Users } from "lucide-react";

function Interviewers() {
  const { interviewers, interviewersLoading } = useInterviewers();

  function InterviewersLoader() {
    return (
      <div className="grid grid-cols-5 gap-6">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="w-[200px] h-[200px] animate-pulse rounded-[20px] bg-gray-100"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  // Empty state when no interviewers exist
  function EmptyState() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Interviewers Yet</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Contact your administrator to set up AI interviewers for your organization.
        </p>
      </div>
    );
  }

  return (
    <main className="p-6 animate-fadeIn">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Interviewers
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Get to know them by clicking the profile.
        </p>
      </div>

      {/* Interviewers Grid */}
      <div className="flex flex-col gap-10">
        {interviewersLoading ? (
          <InterviewersLoader />
        ) : (
          <>
            {interviewers.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {interviewers.map((interviewer) => (
                  <InterviewerCard
                    key={interviewer.id}
                    interviewer={interviewer}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default Interviewers;
