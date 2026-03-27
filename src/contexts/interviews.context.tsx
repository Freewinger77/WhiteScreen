"use client";

import React, { useState, useContext, ReactNode, useEffect, useRef, useCallback } from "react";
import { Interview } from "@/types/interview";
import { InterviewService } from "@/services/interviews.service";
import { useClerk, useOrganization } from "@clerk/nextjs";

interface InterviewContextProps {
  interviews: Interview[];
  setInterviews: React.Dispatch<React.SetStateAction<Interview[]>>;
  getInterviewById: (interviewId: string) => Interview | null | any;
  interviewsLoading: boolean;
  setInterviewsLoading: (interviewsLoading: boolean) => void;
  fetchInterviews: () => Promise<void>;
  updateInterviewInState: (interview: Interview) => void;
  addInterviewToState: (interview: Interview) => void;
  removeInterviewFromState: (interviewId: string) => void;
}

export const InterviewContext = React.createContext<InterviewContextProps>({
  interviews: [],
  setInterviews: () => {},
  getInterviewById: () => null,
  setInterviewsLoading: () => undefined,
  interviewsLoading: false,
  fetchInterviews: async () => {},
  updateInterviewInState: () => {},
  addInterviewToState: () => {},
  removeInterviewFromState: () => {},
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

  const fetchInterviews = useCallback(async () => {
    try {
      setInterviewsLoading(true);
      const response = await InterviewService.getAllInterviews(
        user?.id as string,
        organization?.id as string,
      );
      setInterviews(response || []);
    } catch (error) {
      console.error(error);
    } finally {
      setInterviewsLoading(false);
    }
  }, [user?.id, organization?.id]);

  // Optimistic update functions for smoother UX
  const updateInterviewInState = useCallback((updatedInterview: Interview) => {
    setInterviews(prev => 
      prev.map(interview => 
        interview.id === updatedInterview.id ? updatedInterview : interview
      )
    );
  }, []);

  const addInterviewToState = useCallback((newInterview: Interview) => {
    setInterviews(prev => [newInterview, ...prev]);
  }, []);

  const removeInterviewFromState = useCallback((interviewId: string) => {
    setInterviews(prev => prev.filter(interview => interview.id !== interviewId));
  }, []);

  const getInterviewById = useCallback(async (interviewId: string) => {
    // First check if we already have it in state
    const cachedInterview = interviews.find(i => i.id === interviewId);
    if (cachedInterview) {
      return cachedInterview;
    }
    // Otherwise fetch from API
    const response = await InterviewService.getInterviewById(interviewId);
    return response;
  }, [interviews]);

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
        updateInterviewInState,
        addInterviewToState,
        removeInterviewFromState,
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
