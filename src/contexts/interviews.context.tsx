"use client";

import React, { useState, useContext, ReactNode, useEffect, useRef } from "react";
import { Interview } from "@/types/interview";
import { InterviewService } from "@/services/interviews.service";
import { useClerk, useOrganization } from "@clerk/nextjs";

interface InterviewContextProps {
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
  getInterviewById: (interviewId: string) => Interview | null | any;
  interviewsLoading: boolean;
  setInterviewsLoading: (interviewsLoading: boolean) => void;
  fetchInterviews: () => void;
}

export const InterviewContext = React.createContext<InterviewContextProps>({
  interviews: [],
  setInterviews: () => {},
  getInterviewById: () => null,
  setInterviewsLoading: () => undefined,
  interviewsLoading: false,
  fetchInterviews: () => {},
});

interface InterviewProviderProps {
  children: ReactNode;
}

export function InterviewProvider({ children }: InterviewProviderProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const { user } = useClerk();
  const { organization } = useOrganization();
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const lastOrgIdRef = useRef<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchInterviews = async () => {
    try {
      setInterviewsLoading(true);
      const response = await InterviewService.getAllInterviews(
        user?.id as string,
        organization?.id as string,
      );
      setInterviewsLoading(false);
      setInterviews(response);
    } catch (error) {
      console.error(error);
    }
    setInterviewsLoading(false);
  };

  const getInterviewById = async (interviewId: string) => {
    const response = await InterviewService.getInterviewById(interviewId);

    return response;
  };

  useEffect(() => {
    const orgId = organization?.id || null;
    const userId = user?.id || null;

    // Only fetch when the effective identifiers change
    const shouldFetch =
      (orgId && lastOrgIdRef.current !== orgId) ||
      (userId && lastUserIdRef.current !== userId);

    if (shouldFetch) {
      lastOrgIdRef.current = orgId;
      lastUserIdRef.current = userId;
      fetchInterviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, user?.id]);

  return (
    <InterviewContext.Provider
      value={{
        interviews,
        setInterviews,
        getInterviewById,
        interviewsLoading,
        setInterviewsLoading,
        fetchInterviews,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
}

export const useInterviews = () => {
  const value = useContext(InterviewContext);

  return value;
};
