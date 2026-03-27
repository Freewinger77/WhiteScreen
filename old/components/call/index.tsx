"use client";

import {
  ArrowUpRightSquareIcon,
  AlarmClockIcon,
  XCircleIcon,
  CheckCircleIcon,
  MicIcon,
  MicOffIcon,
  ClockIcon,
  InfoIcon,
  CheckIcon,
  PhoneOffIcon,
  UserIcon,
  PlayIcon,
  BookOpenIcon,
  LinkedinIcon,
  GithubIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Edit2,
  FileUp,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useResponses } from "@/contexts/responses.context";
import Image from "next/image";
import axios from "axios";
import Vapi from "@vapi-ai/web";
import MiniLoader from "../loaders/mini-loader/miniLoader";
import { toast } from "sonner";
import { isLightColor, testEmail } from "@/lib/utils";
import { ResponseService } from "@/services/responses.service";
import { Interview } from "@/types/interview";
import { FeedbackData } from "@/types/response";
import { FeedbackService } from "@/services/feedback.service";
import { FeedbackForm } from "@/components/call/feedbackForm";
import { ClientService } from "@/services/clients.service";
import { isCustomLogoUpload } from "@/lib/storage";
import {
  TabSwitchWarning,
  useTabSwitchPrevention,
} from "./tabSwitchPrevention";
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
import { InterviewerService } from "@/services/interviewers.service";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from 'uuid';
import { signIn, signOut, useSession } from 'next-auth/react';

const vapiClient = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");

type InterviewProps = {
  interview: Interview;
};

type registerCallResponseType = {
  data: {
    registerCallResponse: {
      call_id: string;
      access_token: string;
      dynamic_data?: {
        name: string;
        mins: string;
        objective: string;
        job_context: string;
        questions: string;
      };
    };
  };
};

type transcriptType = {
  role: string;
  content: string;
};

function Call({ interview }: InterviewProps) {
  const { createResponse } = useResponses();
  const { data: session } = useSession();
  const [lastInterviewerResponse, setLastInterviewerResponse] =
    useState<string>("");
  const [lastUserResponse, setLastUserResponse] = useState<string>("");
  const [activeTurn, setActiveTurn] = useState<string>("");
  const [isLoadingPractice, setIsLoadingPractice] = useState(false);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [linkedinProfile, setLinkedinProfile] = useState<string>("");
  const [githubProfile, setGithubProfile] = useState<string>("");
  
  // CV Upload State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvParsedText, setCvParsedText] = useState<string>("");
  const [cvStorageUrl, setCvStorageUrl] = useState<string>("");
  const [isParsingCv, setIsParsingCv] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const [isValidEmail, setIsValidEmail] = useState<boolean>(false);
  const [isOldUser, setIsOldUser] = useState<boolean>(false);
  const [callId, setCallId] = useState<string>("");
  const { tabSwitchCount, tabSwitchEvents, resetTracking } = useTabSwitchPrevention({ 
    isTracking: isCalling // Only track during active call
  });
  
  // Use refs to track latest values for closures
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const tabSwitchEventsRef = useRef(tabSwitchEvents);
  
  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
    tabSwitchEventsRef.current = tabSwitchEvents;
  }, [tabSwitchCount, tabSwitchEvents]);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interviewerImg, setInterviewerImg] = useState("");
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [interviewTimeDuration, setInterviewTimeDuration] =
    useState<string>("1");
  const [time, setTime] = useState(0);
  const [currentTimeDuration, setCurrentTimeDuration] = useState<string>("0");
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const hasSavedRef = useRef<boolean>(false);
  
  // LinkedIn edit states
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);

  // --- Practice State ---
  const [isPracticing, setIsPracticing] = useState<boolean>(false);
  const [practiceTimeLeft, setPracticeTimeLeft] = useState<number>(120); // 2 minutes in seconds
  const practiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // --- End Practice State ---

  const lastUserResponseRef = useRef<HTMLDivElement | null>(null);

  // --- Mic Permission State ---
  const [micPermissionStatus, setMicPermissionStatus] = useState<
    'idle' | 'checking' | 'granted' | 'denied' | 'prompt'
  >('idle');
  // --- End Mic Permission State ---

  // --- Multi-step Setup State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const universeRef = useRef<HTMLDivElement>(null);
  // --- End Multi-step Setup State ---

  // --- Unmute Instruction State ---
  const [showUnmuteInstruction, setShowUnmuteInstruction] = useState(false);
  const [showMuteGuide, setShowMuteGuide] = useState(true);
  // --- End Unmute Instruction State ---

  // --- State to hold args for delayed start ---
  const [startFunctionArgs, setStartFunctionArgs] = useState<{ practiceMode: boolean } | null>(null);
  // --- End State ---

  // Stars animation effect
  useEffect(() => {
    const universe = universeRef.current;
    if (!universe) return;

    const layerCount = 5;
    const starCount = 200;
    const maxTime = 30;
    const width = (window.innerWidth || 1920) + 200; // Add extra width to cover edges
    const height = (window.innerHeight || 1080) + 200; // Add extra height to cover edges

    // Clear existing stars
    universe.innerHTML = "";

    for (let i = 0; i < starCount; i++) {
      const ypos = Math.round(Math.random() * height);
      const star = document.createElement("div");
      const speed = 1000 * (Math.random() * maxTime + 1);
      const starClass = 3 - Math.floor(speed / 1000 / 8);

      // Set star styles
      star.style.position = "absolute";
      star.style.backgroundColor = "white";
      star.style.opacity = "0.8";

      if (starClass === 0) {
        star.style.height = "1px";
        star.style.width = "1px";
      } else if (starClass === 1) {
        star.style.height = "2px";
        star.style.width = "2px";
        star.style.borderRadius = "50%";
      } else if (starClass === 2) {
        star.style.height = "3px";
        star.style.width = "3px";
        star.style.borderRadius = "50%";
      } else {
        star.style.height = "4px";
        star.style.width = "4px";
        star.style.borderRadius = "50%";
      }

      universe.appendChild(star);

      // Animate star
      star.animate(
        [
          {
            transform: `translate3d(${width + 100}px, ${ypos}px, 0)`,
            opacity: "0",
          },
          {
            transform: `translate3d(-${Math.random() * 356}px, ${ypos}px, 0)`,
            opacity: "0.8",
          },
        ],

        {
          delay: Math.random() * -speed,
          duration: speed,
          iterations: Infinity,
        }
      );
    }
  }, []);

  const handleFeedbackSubmit = async (
    formData: Omit<FeedbackData, "interview_id">,
  ) => {
    try {
      const result = await FeedbackService.submitFeedback({
        ...formData,
        interview_id: interview.id,
      });

      if (result) {
        toast.success("Thank you for your feedback!");
        setIsFeedbackSubmitted(true);
        setIsDialogOpen(false);
      } else {
        toast.error("Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("An error occurred. Please try again later.");
    }
  };

  useEffect(() => {
    if (lastUserResponseRef.current) {
      const { current } = lastUserResponseRef;
      current.scrollTop = current.scrollHeight;
    }
  }, [lastUserResponse]);

  // --- Actual Interview Timer ---
  useEffect(() => {
    let intervalId: any;
    // Only run this timer if NOT practicing
    if (isCalling && !isPracticing) {
      intervalId = setInterval(() => setTime(time + 1), 10);
    }
    // Only update duration display if NOT practicing
    if (!isPracticing) {
      setCurrentTimeDuration(String(Math.floor(time / 100)));
    }
    // NOTE: Removed auto-end logic - interviews now continue until all questions are completed
    // The AI agent will naturally end the call when the interview is complete

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalling, time, currentTimeDuration, isPracticing, interviewTimeDuration]); // Added isPracticing and interviewTimeDuration

  // --- Practice Timer Logic ---
  useEffect(() => {
    // Only run this timer if practicing
    if (isPracticing && isStarted && practiceTimeLeft > 0) {
      practiceIntervalRef.current = setInterval(() => {
        setPracticeTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isPracticing && isStarted && practiceTimeLeft === 0) {
      console.log("Practice time ended. Stopping call.");
      vapiClient.stop(); // Stop call when practice timer ends
      // `isEnded` will be set by the 'call-end' event listener
      // endPractice(); // Don't call endPractice here, let call-end handle state
    }

    // Cleanup interval
    return () => {
      if (practiceIntervalRef.current) {
        clearInterval(practiceIntervalRef.current);
      }
    };
    // Added isStarted dependency
  }, [isPracticing, practiceTimeLeft, isStarted]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    // Add newline before return
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  // --- End Practice Timer Logic ---

  useEffect(() => {
    if (testEmail(email)) {
      setIsValidEmail(true);
    }
  }, [email]);

  // Auto-populate fields from LinkedIn session
  useEffect(() => {
    if (session?.user && !interview?.is_anonymous) {
      if (!isEditingEmail && session.user.email) {
        setEmail(session.user.email);
      }
      if (!isEditingName && session.user.name) {
        setName(session.user.name);
      }
    }
  }, [session, isEditingEmail, isEditingName, interview?.is_anonymous]);

  // --- Vapi Event Listeners ---
  useEffect(() => {
    // Track accumulated text for current turn (matches Retell's turn-based display)
    let assistantTurnText = "";
    let userTurnText = "";
    let lastSpeaker = "";  // Track who spoke last to detect turn changes

    vapiClient.on("call-start", () => {
      console.log("Call started (practice:", isPracticing, ")");
      setIsCalling(true);
      setIsConnecting(false);  // Hide connecting loader
      // Explicitly mute mic on call start
      vapiClient.setMuted(true);
    });

    const persistEnd = async () => {
      try {
        if (hasSavedRef.current) return;
        if (isPracticing) return;
        if (!callId) return;
        hasSavedRef.current = true;
        console.log("[persistEnd] Persisting end of interview for callId:", callId);
        // Combine LinkedIn and GitHub profiles with comma separator
        const linkedinUrl = linkedinProfile ? `linkedin.com/in/${linkedinProfile}` : '';
        const githubUrl = githubProfile ? `github.com/${githubProfile}` : '';
        const profileIds = [
          session?.user?.linkedinId,
          linkedinUrl,
          githubUrl
        ].filter(Boolean).join(', ');
        
        // Use refs to get latest tab switch data
        const currentTabSwitchCount = tabSwitchCountRef.current;
        const currentTabSwitchEvents = tabSwitchEventsRef.current;
        
        await ResponseService.saveResponse(
          {
            is_ended: true,
            tab_switch_count: currentTabSwitchCount,
            tab_switch_events: currentTabSwitchEvents.length > 0 ? currentTabSwitchEvents : null,
            interview_id: interview.id,
            email,
            name,
            profile_id: profileIds || null,
            profile_type: session?.user?.linkedinId ? 'linkedin' : null,
          },
          callId,
        );
        
        console.log("[persistEnd] Persisted successfully for callId:", callId, "Tab switches:", currentTabSwitchCount, "Events:", currentTabSwitchEvents);
      } catch (error) {
        console.error("[persistEnd] Failed to persist end:", error);
      }
    };

    vapiClient.on("call-end", () => {
      console.log("Call ended (practice:", isPracticing, ")");
      setIsCalling(false);
      setIsEnded(true);
      // Clear practice timer if it's still running
      if (practiceIntervalRef.current) {
        clearInterval(practiceIntervalRef.current);
      }
      // Ensure persistence even if effect does not run in time
      persistEnd();
    });

    vapiClient.on("speech-start", () => {
      console.log("🎤 SPEECH-START: Agent starting to talk");
      setActiveTurn("agent");
      // Don't clear user text here - wait for user to speak again
    });

    vapiClient.on("speech-end", () => {
      console.log("🛑 SPEECH-END: Agent stopped talking");
      setActiveTurn("user");
      // Don't reset accumulator here - it's handled in message event
    });

    vapiClient.on("error", (error) => {
      console.error("An error occurred:", error);
      vapiClient.stop(); // Ensure call stops on error
      setIsEnded(true);
      setIsCalling(false);
    });

    vapiClient.on("message", (message: any) => {
      // 🔍 DEBUG: Log all transcript messages
      if (message.type === "transcript") {
        console.log("📝 TRANSCRIPT:", {
          role: message.role,
          type: message.transcriptType,
          text: message.transcript,
        });
      }
      
      if (message.type === "transcript") {
        const transcriptText = message.transcript || "";
        if (!transcriptText) return;
        
        // === ASSISTANT MESSAGES ===
        if (message.role === "assistant") {
          
          // PARTIAL: Show live building of current sentence + previous sentences
          if (message.transcriptType === "partial") {
            // Clear old turn on FIRST partial of NEW turn
            if (lastSpeaker !== "assistant") {
              console.log("🔄 NEW AI TURN - clearing old AI text");
              assistantTurnText = "";
              lastSpeaker = "assistant";
            }
            // Show accumulated turn + current sentence building
            const liveText = assistantTurnText 
              ? assistantTurnText + " " + transcriptText 
              : transcriptText;
            console.log("⏩ LIVE AI:", liveText);
            setLastInterviewerResponse(liveText);
          }
          
          // FINAL: ACCUMULATE sentence into full turn
          if (message.transcriptType === "final") {
            // Add this sentence to the turn
            assistantTurnText += (assistantTurnText ? " " : "") + transcriptText;
            console.log("✅ FINAL AI (accumulated):", assistantTurnText);
            setLastInterviewerResponse(assistantTurnText);
          }
        }
        
        // === USER MESSAGES ===
        else if (message.role === "user") {
          
          // PARTIAL: Show live building of current sentence + previous sentences
          if (message.transcriptType === "partial") {
            // Clear old turn on FIRST partial of NEW turn
            if (lastSpeaker !== "user") {
              console.log("🔄 NEW USER TURN - clearing old user text");
              userTurnText = "";
              lastSpeaker = "user";
            }
            // Show accumulated turn + current sentence building
            const liveText = userTurnText 
              ? userTurnText + " " + transcriptText 
              : transcriptText;
            console.log("⏩ LIVE USER:", liveText);
            setLastUserResponse(liveText);
          }
          
          // FINAL: ACCUMULATE sentence into full turn
          if (message.transcriptType === "final") {
            // Add this sentence to the turn
            userTurnText += (userTurnText ? " " : "") + transcriptText;
            console.log("✅ FINAL USER (accumulated):", userTurnText);
            setLastUserResponse(userTurnText);
          }
        }
      }
    });

    return () => {
      vapiClient.removeAllListeners();
    };
    // isPracticing dependency added to ensure listeners have correct state context if needed, although current listeners don't use it directly.
  }, [isPracticing]);

  // --- End Call / End Practice Handler ---
  const handleEndCall = async () => {
    console.log("handleEndCall triggered (practice:", isPracticing, ")");
    vapiClient.stop();
    // isEnded will be set by the 'call-end' listener
  };

  // --- Quick Microphone Access Check ---
  const checkMicrophoneAccess = async (): Promise<boolean> => {
    console.log("Attempting quick microphone access check...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      console.log("Microphone access successful.");

      return true; // Added newline before return
    } catch (error) {
      console.error("Quick microphone access check failed:", error);
      toast.error("Could not access microphone. Please check connection and system settings.");

      return false; // Added newline before return
    }
  };
  // --- End Quick Check ---

  // --- Part 2: Execute the actual start logic (called after popup) ---
  const executeStartConversation = async () => {
    if (!startFunctionArgs) {
      console.error("executeStartConversation called without args");

      return; // Added newline
    }
    const { practiceMode } = startFunctionArgs;
    setStartFunctionArgs(null); // Clear args immediately

    console.log(`Executing start conversation (practice: ${practiceMode})`);

    const userEmail = practiceMode && interview?.is_anonymous ? "practice@example.com" : email;
    const userName = practiceMode && interview?.is_anonymous ? "Practice User" : name;

    // Set loading state early
    if (practiceMode) { setIsLoadingPractice(true); } else { setIsLoadingInterview(true); }
    setIsPracticing(practiceMode);

    try {
      // --- Pre-call checks (only for real interviews) ---
      if (!practiceMode) {
        console.log("[executeStartConversation] Checking for existing responses...");
        const oldUserEmails: string[] = (
          await ResponseService.getAllEmails(interview.id)
        ).map((item) => item.email);
        const isActuallyOldUser =
          oldUserEmails.includes(userEmail) ||
          (interview?.respondents && !interview?.respondents.includes(userEmail));

        if (isActuallyOldUser) {
          console.log("[executeStartConversation] User already responded or not permitted.");
          setIsOldUser(true);
          toast.error("You have already responded to this interview or are not permitted.");
          setIsPracticing(false); // Reset practice state
          if (practiceMode) { setIsLoadingPractice(false); } else { setIsLoadingInterview(false); }

          return; // Added newline
        }
        console.log("[executeStartConversation] No existing response found.");
      }

      // --- Prepare data for Retell API ---
      const data = {
        mins: practiceMode ? "2" : interview?.time_duration,
        objective: interview?.objective,
        questions: interview?.questions
          .map((q, index) => {
            const maxFollowUps = q.follow_up_count === 1 ? 3 : q.follow_up_count === 2 ? 5 : 7;
            return `Question ${index + 1} (follow_up_count: ${q.follow_up_count}, max ${maxFollowUps} follow-ups): ${q.question}`;
          })
          .join(", "),
        name: userName || "not provided",
        job_context: interview?.job_context || "No specific job context provided.",
      };

      console.log("[executeStartConversation] Calling /api/register-call...");
      const registerCallResponse: registerCallResponseType = await axios.post(
        "/api/register-call",
        {
          dynamic_data: data,
          interviewer_id: interview?.interviewer_id,
          is_practice: practiceMode,
        }
      );
      console.log("[executeStartConversation] API response received:", registerCallResponse.data);

      if (registerCallResponse.data.registerCallResponse.access_token) {
        const currentCallId = registerCallResponse?.data?.registerCallResponse?.call_id;
        console.log(`[executeStartConversation] Got temporary call ID: ${currentCallId}`);
        setCallId(currentCallId);

        // --- Create Database Record (Real Interviews Only) ---
        let newResponseId = null;
        if (!practiceMode) {
          console.log("[executeStartConversation] Creating DB record...");
          // Combine LinkedIn and GitHub profiles with comma separator
          const linkedinUrl = linkedinProfile ? `linkedin.com/in/${linkedinProfile}` : '';
          const githubUrl = githubProfile ? `github.com/${githubProfile}` : '';
          const profileIds = [
            session?.user?.linkedinId,
            linkedinUrl,
            githubUrl
          ].filter(Boolean).join(', ');
          
          // Build details object with CV info if available
          const detailsObj: any = {};
          if (cvParsedText) {
            detailsObj.attached_cv = {
              text: cvParsedText,
              url: cvStorageUrl || null,
              fileName: cvFile?.name || null,
            };
            console.log("[executeStartConversation] CV attached to response:", {
              fileName: cvFile?.name,
              textLength: cvParsedText.length,
              hasUrl: !!cvStorageUrl
            });
          }
          
          newResponseId = await createResponse({
            interview_id: interview.id,
            call_id: currentCallId,
            email: userEmail,
            name: userName,
            details: Object.keys(detailsObj).length > 0 ? detailsObj : null,
            profile_id: profileIds || null,
            profile_type: session?.user?.linkedinId ? 'linkedin' : null,
          });
          if (!newResponseId) {
            console.error("[executeStartConversation] Failed to create DB record (no id returned)");
            toast.error("Could not create interview record. Please try again.");
          } else {
            console.log("[executeStartConversation] DB record created with id:", newResponseId);
          }
        } else {
          console.log("[executeStartConversation] Practice mode: Skipping DB record creation.");
          setPracticeTimeLeft(120); // Reset practice timer
        }

        // --- Start Vapi Call ---
        console.log("[executeStartConversation] Starting Vapi web client call...");
        
        // access_token is actually the assistant ID
        const assistantId = registerCallResponse.data.registerCallResponse.access_token;
        const dynamicData = registerCallResponse.data.registerCallResponse.dynamic_data;
        
        console.log("[executeStartConversation] Assistant ID:", assistantId);
        console.log("[executeStartConversation] Dynamic data:", dynamicData);
        
        // Start Vapi call with assistant ID and variable overrides
        const call = await vapiClient.start(
          assistantId, // Assistant ID
          {
            variableValues: dynamicData, // Pass interview data as variables
          }
        );
        
        console.log("[executeStartConversation] Vapi call initiated:", call);
        
        // Show connecting loader while waiting for call-start event
        setIsConnecting(true);
        
        // Update call ID with actual call ID from Vapi
        if (call?.id) {
          const realCallId = call.id;
          const tempCallId = currentCallId;
          
          console.log("[executeStartConversation] Got real Vapi call ID:", realCallId);
          console.log("[executeStartConversation] Replacing temp ID:", tempCallId);
          
          // Update DB record with actual call ID if not practice mode
          if (!practiceMode && tempCallId) {
            try {
              // Update the response record: temp call_id → real call_id
              await ResponseService.updateResponse(
                { call_id: realCallId },
                tempCallId
              );
              console.log("[executeStartConversation] ✅ Updated DB with real call ID:", realCallId);
            } catch (error) {
              console.error("[executeStartConversation] ❌ Failed to update DB with real call ID:", error);
            }
          }
          
          // Update state with real call ID
          setCallId(realCallId);
        }
        
        setIsStarted(true);

      } else {
        console.error("[executeStartConversation] Failed to register call - API response missing access token.");
        toast.error("Could not initiate the call. Please try again.");
        setIsPracticing(false); // Reset practice state
      }
    } catch (error) {
        console.error("[executeStartConversation] Error caught:", error);
        // Display a more specific error if it's a known type, otherwise generic
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast.error(`Error starting call: ${errorMessage}`);
        setIsPracticing(false); // Reset practice state
    } finally {
        // Reset loading state regardless of success or failure
        if (practiceMode) { setIsLoadingPractice(false); } else { setIsLoadingInterview(false); }
    }
  };

  // --- CV Upload Handler ---
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input value so same file can be re-selected
    e.target.value = '';
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const validExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      toast.error("Please upload a PDF, DOC, DOCX, or TXT file");
      return;
    }
    
    setCvFile(file);
    setIsParsingCv(true);
    
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interviewId', interview?.id || '');
      
      // Upload and parse CV
      const response = await axios.post('/api/upload-candidate-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setCvParsedText(response.data.parsedText || '');
        setCvStorageUrl(response.data.storageUrl || '');
        toast.success("CV uploaded successfully!");
      } else {
        throw new Error(response.data.error || "Failed to process CV");
      }
    } catch (error: any) {
      console.error("CV upload error:", error);
      toast.error(error?.response?.data?.error || "Failed to upload CV");
      setCvFile(null);
      setCvParsedText("");
      setCvStorageUrl("");
    } finally {
      setIsParsingCv(false);
    }
  };
  // --- End CV Upload Handler ---

  // --- Part 1: Prepare to start (called by buttons) ---
  const prepareToStartConversation = async (practiceMode: boolean) => {
    if (micPermissionStatus !== 'granted') {
      toast.error("Please grant microphone permission first.");
      requestMicPermission();

      return; // Added newline before return
    }

    // 1.5 Perform quick access check
    const canAccessMic = await checkMicrophoneAccess();
    if (!canAccessMic) {
        // Error toast is shown within checkMicrophoneAccess
        return; // Don't proceed if access failed
    }

    // 2. Check email/name validation if required for the specific mode
     if (!practiceMode && !interview?.is_anonymous && (!isValidEmail || !name)) {
        toast.error("Please enter a valid email and your first name to start the interview.");

        return; // Added newline before return
     }
     // 3. Check if already started/loading (shouldn't happen if buttons disabled, but belt-and-suspenders)
     if (isStarted || isLoadingInterview || isLoadingPractice) {
        console.warn("Attempted to start conversation while already started or loading.");

        return; // Added newline before return
     }

    console.log(`Preparing to start conversation (practice: ${practiceMode})`);
    // Set args and show instruction popup
    setStartFunctionArgs({ practiceMode });
    setShowUnmuteInstruction(true);
  };

  useEffect(() => {
    if (interview?.time_duration) {
      setInterviewTimeDuration(interview?.time_duration);
    }
  }, [interview]);

  useEffect(() => {
    const fetchInterviewer = async () => {
      const interviewer = await InterviewerService.getInterviewer(
        interview.interviewer_id,
      );
      setInterviewerImg(interviewer.image);
    };
    fetchInterviewer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.interviewer_id]);

  // Fetch organization logo if interview doesn't have a custom logo
  useEffect(() => {
    const fetchOrganizationLogo = async () => {
      // Only fetch if interview has no custom logo uploaded
      if (!isCustomLogoUpload(interview.logo_url) && interview.organization_id) {
        const orgLogo = await ClientService.getOrganizationLogoById(
          interview.organization_id
        );
        setOrganizationLogo(orgLogo);
      }
    };
    fetchOrganizationLogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.organization_id, interview.logo_url]);

  // --- Save Response Effect ---
  useEffect(() => {
    // Only save response if the call has ended AND it was NOT a practice session
    if (isEnded && callId && !isPracticing) {
      console.log("Real interview ended. Saving response.");
      const updateResponse = async () => {
        try {
          // Combine LinkedIn and GitHub profiles with comma separator
          const linkedinUrl = linkedinProfile ? `linkedin.com/in/${linkedinProfile}` : '';
          const githubUrl = githubProfile ? `github.com/${githubProfile}` : '';
          const profileIds = [
            session?.user?.linkedinId,
            linkedinUrl,
            githubUrl
          ].filter(Boolean).join(', ');
          
          // Use refs to get latest tab switch data
          const currentTabSwitchCount = tabSwitchCountRef.current;
          const currentTabSwitchEvents = tabSwitchEventsRef.current;
          
          await ResponseService.saveResponse(
            {
              is_ended: true,
              tab_switch_count: currentTabSwitchCount,
              tab_switch_events: currentTabSwitchEvents.length > 0 ? currentTabSwitchEvents : null,
              // also persist primary identifiers in case initial insert failed
              interview_id: interview.id,
              email,
              name,
              profile_id: profileIds || null,
              profile_type: session?.user?.linkedinId ? 'linkedin' : null,
            },
            callId,
          );
          console.log("Response saved successfully for callId:", callId, "Tab switches:", currentTabSwitchCount);
        } catch (error) {
           console.error("Failed to save response:", error);
        }
      };
      updateResponse();
    } else if (isEnded && isPracticing) {
        console.log("Practice interview ended. Not saving response.");
        // Optionally reset isPracticing here if needed, depends on desired flow after practice ends
        // setIsPracticing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnded, callId, isPracticing, tabSwitchCount]); // Added isPracticing and callId

  // Handle mute toggle
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    vapiClient.setMuted(newMutedState);
    // Hide the guide after first interaction
    if (showMuteGuide) {
      setShowMuteGuide(false);
    }
  };

  // --- Mic Permission Logic ---
  const requestMicPermission = async () => {
    console.log("Requesting microphone permission...");
    setMicPermissionStatus('checking');
    try {
      // Request access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // Got permission, stop the tracks immediately as we only needed the prompt
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionStatus('granted');
      setMicPermissionGranted(true);
      console.log("Microphone permission granted by user.");

      return true; // Added newline before return
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setMicPermissionStatus('denied');
      toast.error("Microphone access denied. Please grant permission in browser settings.");

      // Add newline before return
      return false;
    }
  };

  useEffect(() => {
    // Check initial permission status on mount
    if (typeof navigator !== 'undefined' && navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' as PermissionName }).then((permissionStatus) => {
        setMicPermissionStatus(permissionStatus.state);
        if (permissionStatus.state === 'granted') {
          setMicPermissionGranted(true);
        }
        console.log("Initial microphone permission state:", permissionStatus.state);

        permissionStatus.onchange = () => {
          setMicPermissionStatus(permissionStatus.state);
          if (permissionStatus.state === 'granted') {
            setMicPermissionGranted(true);
          }
           console.log("Microphone permission state changed to:", permissionStatus.state);
           if (permissionStatus.state === 'denied' && micPermissionStatus !== 'denied') {
              // Show toast only if changing to denied
              toast.error("Microphone access denied. Please grant permission in browser settings.");
           }
        };
      }).catch(error => {
         console.error("Error querying microphone permission:", error);
         setMicPermissionStatus('denied'); // Assume denied if query fails
      });
    } else {
        console.warn("Permissions API not supported, proceeding without pre-check.");
        // Fallback: Assume 'prompt' or handle differently if needed
        setMicPermissionStatus('prompt'); // Or maybe 'granted' optimistically? Let's assume prompt.
    }
  }, []); // Empty dependency array ensures this runs only once on mount
  // --- End Mic Permission Logic ---

  // --- Multi-step Navigation ---
  const handleNextStep = () => {
    if (currentStep < 4) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 1:
        // If anonymous: can always proceed
        // If not anonymous: need session or valid name/email
        return interview?.is_anonymous || session?.user || (name && isValidEmail);
      case 2:
        return micPermissionGranted;
      case 3:
        return true; // LinkedIn profile is optional
      default:
        return true;
    }
  };

  const handleContinueLogin = () => {
    // Simulate LinkedIn login (in real implementation this would be handled by NextAuth)
    if (!session?.user) {
      signIn('linkedin');
    }
  };

  const toggleManualEntry = () => {
    setShowManualEntry(!showManualEntry);
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Full Page Interstellar Background */}
      <div
        className="absolute inset-0"
                style={{
          background: "linear-gradient(to right, #00223e, #ffa17f)",
        }}
      >
        {/* Stars Universe - Full Page */}
        <div
          ref={universeRef}
          className="absolute inset-0 overflow-hidden"
        ></div>
            </div>

      {isStarted && !isPracticing && !isEnded && <TabSwitchWarning />}
      
      {/* Connecting Loader Overlay */}
      {isConnecting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
            <div className="flex flex-col items-center gap-4">
              <MiniLoader />
              <p className="text-white text-lg font-medium animate-pulse">
                Connecting to AI...
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Content Container */}
      <div className="relative z-10 h-full flex overflow-y-auto">
        {/* Left Half - Info */}
        <div className="flex-1 flex flex-col justify-center p-12 text-white">
          <div className="max-w-2xl">
            {/* Icon */}
            {isCustomLogoUpload(interview?.logo_url) ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-8 shadow-2xl overflow-hidden">
                  <Image
                    src={interview.logo_url!}
                    alt="Organization logo"
                    width={64}
                    height={64}
                    className="object-contain h-full w-full"
                  />
                </div>
              ) : organizationLogo ? (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-8 shadow-2xl overflow-hidden">
                  <Image
                    src={organizationLogo}
                    alt="Organization logo"
                    width={64}
                    height={64}
                    className="object-contain h-full w-full"
                  />
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mb-8 shadow-2xl">
                  <UserIcon className="w-8 h-8 text-white" />
                </div>
              )}

            {/* Title - Fixed */}
            <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {interview?.name || 'Interview'}
            </h1>

            <div className="flex items-center text-2xl text-blue-200 mb-6">
              <ClockIcon className="w-8 h-8 mr-4" />
              Estimate duration: {interviewTimeDuration} minutes
                  </div>

            {/* Interview Description */}
            {interview?.description && (
              <div className="mb-10 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-3">
                  About This Interview
                </h3>
                <p className="text-blue-100 leading-relaxed">
                  {interview.description}
                </p>
                </div>
              )}

            {/* Instructions */}
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                <span className="text-sm font-medium text-blue-200">
                  Interview Setup
                </span>
              </div>

              <div className="space-y-4">
                <h3 className="text-3xl font-semibold text-white mb-6">
                  Before we start:
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-blue-400 rounded-full mt-3 mr-5 flex-shrink-0"></div>
                    <p className="text-blue-100 text-xl leading-relaxed">
                      Ensure your volume is up and{" "}
                      <span className="font-semibold text-white">
                        grant microphone access
                      </span>
                    </p>
                    </div>
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-purple-400 rounded-full mt-3 mr-5 flex-shrink-0"></div>
                    <p className="text-blue-100 text-xl leading-relaxed">
                      Find a quiet environment for the best experience
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-pink-400 rounded-full mt-3 mr-5 flex-shrink-0"></div>
                    <p className="text-blue-100 text-xl leading-relaxed">
                      Your microphone will be muted by default - click "Unmute"
                      to speak
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-orange-400 rounded-full mt-3 mr-5 flex-shrink-0"></div>
                    <p className="text-blue-100 text-xl leading-relaxed">
                      <span className="font-semibold text-white">Note:</span>{" "}
                      Tab switching during interviews will be recorded
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Half - Typeform Style Setup */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            {!isStarted && !isEnded && !isOldUser ? (
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-3xl min-h-[600px] flex flex-col">
                {/* Progress Bar */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Step {currentStep} of 4
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round((currentStep / 4) * 100)}%
                        </span>
                      </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(currentStep / 4) * 100}%` }}
                    ></div>
                    </div>
                  </div>

                {/* Step Content Container */}
                <div className="flex-1 p-10 relative overflow-hidden">
                  {/* Full page gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 rounded-3xl"></div>

                  {/* Step Content with Slide Animation */}
                  <div
                    className={`relative z-10 h-full flex flex-col justify-center transition-all duration-300 ${
                      isTransitioning
                        ? "opacity-0 transform translate-x-8"
                        : "opacity-100 transform translate-x-0"
                    }`}
                  >
                    {/* Step 1: Sign In */}
                    {currentStep === 1 && (
                      <div className="space-y-8 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-bold text-gray-900">
                            {interview?.is_anonymous ? "Welcome" : "Sign In"}
                          </h2>
                          <p className="text-lg text-gray-600">
                            {interview?.is_anonymous 
                              ? "This is an anonymous interview. Click Next to continue."
                              : "Connect with LinkedIn or enter your details manually"}
                          </p>
                        </div>
                        <div className="max-w-md mx-auto space-y-6">
                  {!interview?.is_anonymous ? (
                            <>
                      {session?.user ? (
                                // LinkedIn authenticated - show success state
                                <div className="space-y-4">
                                  <div className="flex justify-center items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                                    <LinkedinIcon className="h-5 w-5 text-[#0077B5]" />
                                    <span className="text-sm font-medium text-green-700">Signed in as {session.user.name}</span>
                            <button
                              onClick={() => signOut()}
                                      className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
                            >
                              Sign out
                            </button>
                          </div>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    onClick={handleContinueLogin}
                                    className="w-full bg-[#0077B5] hover:bg-[#005885] text-white py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                                  >
                                    <LinkedinIcon className="mr-3 h-6 w-6" />
                                    Sign in with LinkedIn
                                  </Button>

                                  <button
                                    onClick={toggleManualEntry}
                                    className="w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center py-3 hover:bg-blue-50 rounded-xl transition-all duration-200"
                                  >
                                    or enter manually
                                    {showManualEntry ? (
                                      <ChevronUpIcon className="ml-2 h-4 w-4" />
                                    ) : (
                                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                                    )}
                                  </button>

                                  {showManualEntry && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                      <Input
                              placeholder="Enter your first name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="bg-gray-50 border-gray-200 py-4 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                                      <Input
                              type="email"
                              placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="bg-gray-50 border-gray-200 py-4 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                                  )}
                                </>
                              )}
                            </>
                          ) : (
                            <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                              <p className="text-gray-700">
                                This is an anonymous interview. No sign-in required!
                              </p>
                              <p className="text-sm text-gray-500 mt-2">
                                Click "Next" to continue to the microphone setup.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Microphone Access */}
                    {currentStep === 2 && (
                      <div className="space-y-8 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-bold text-gray-900">
                            Enable Microphone
                          </h2>
                          <p className="text-lg text-gray-600">
                            We need access to your microphone for the interview
                          </p>
                        </div>
                        <div className="max-w-md mx-auto">
                          {/* Sleek Status Alert */}
                          <div className={`p-4 rounded-xl border-2 ${
                            micPermissionStatus === 'granted'
                              ? 'border-emerald-200 bg-emerald-50/80 backdrop-blur-sm'
                              : micPermissionStatus === 'checking'
                              ? 'border-blue-200 bg-blue-50/80 backdrop-blur-sm'
                              : 'border-orange-200 bg-orange-50/80 backdrop-blur-sm'
                          }`}>
                            <div className="flex items-center justify-center space-x-3">
                              {micPermissionStatus === 'granted' ? (
                                <CheckIcon className="h-5 w-5 text-emerald-600" />
                              ) : micPermissionStatus === 'checking' ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                              ) : (
                                <InfoIcon className="h-5 w-5 text-orange-600" />
                              )}
                              <span className={`font-medium ${
                                micPermissionStatus === 'granted'
                                  ? 'text-emerald-800'
                                  : micPermissionStatus === 'checking'
                                  ? 'text-blue-800'
                                  : 'text-orange-800'
                              }`}>
                                {micPermissionStatus === 'granted'
                                  ? 'Microphone Access Granted'
                                  : micPermissionStatus === 'checking'
                                  ? 'Requesting Microphone Access...'
                                  : 'Mic Access Required'}
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              onClick={requestMicPermission}
                              disabled={micPermissionStatus === 'checking' || micPermissionStatus === 'granted'}
                              size="sm"
                              className={
                                micPermissionStatus === 'granted'
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 border-0"
                                  : micPermissionStatus === 'checking'
                                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 border-0 cursor-wait"
                                  : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 border-0 transition-all duration-200"
                              }
                            >
                              {micPermissionStatus === 'checking' ? (
                                <>
                                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  <span className="text-xs font-medium">Requesting...</span>
                                </>
                              ) : micPermissionStatus === 'granted' ? (
                                <>
                                  <CheckIcon className="mr-2 h-3 w-3" />
                                  <span className="text-xs font-medium">Access Granted</span>
                                </>
                              ) : (
                                <>
                                  <MicIcon className="mr-2 h-3 w-3" />
                                  <span className="text-xs font-medium">Allow Microphone</span>
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Error State */}
                          {micPermissionStatus === 'denied' && (
                            <div className="mt-4 p-4 rounded-xl border-2 border-red-200 bg-red-50/80 backdrop-blur-sm">
                              <div className="flex items-center justify-center space-x-2">
                                <XCircleIcon className="h-4 w-4 text-red-600" />
                                <span className="text-red-800 font-medium text-sm">
                                  Microphone access was denied. Please enable it in your browser settings and try again.
                                </span>
                          </div>
                            </div>
                          )}
                          </div>
                        </div>
                      )}

                    {/* Step 3: CV Upload */}
                    {currentStep === 3 && (
                      <div className="space-y-8 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-bold text-gray-900">
                            Upload Your CV
                          </h2>
                          <p className="text-lg text-gray-600">
                            Attach your resume to enhance your evaluation (optional)
                          </p>
                        </div>
                        <div className="max-w-md mx-auto space-y-4">
                          {/* CV Upload Area */}
                          <input
                            type="file"
                            ref={cvInputRef}
                            accept=".pdf,.doc,.docx,.txt"
                            className="hidden"
                            onChange={handleCvUpload}
                          />
                          
                          {!cvFile ? (
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                cvInputRef.current?.click();
                              }}
                              className="border-2 border-dashed border-gray-300 rounded-2xl p-8 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all duration-300 group"
                            >
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                  <FileUp className="h-8 w-8 text-orange-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800">
                                    Click to upload your CV
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    PDF, DOC, DOCX, or TXT (max 10MB)
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-green-300 bg-green-50/50 rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {isParsingCv ? (
                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                      <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                      <CheckIcon className="h-5 w-5 text-green-600" />
                                    </div>
                                  )}
                                  <div className="text-left">
                                    <p className="font-medium text-gray-800 truncate max-w-[220px] text-sm">
                                      {cvFile.name}
                                    </p>
                                    <p className="text-xs text-green-600">
                                      {isParsingCv ? "Processing..." : "CV attached successfully"}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCvFile(null);
                                    setCvParsedText("");
                                    setCvStorageUrl("");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-500 mt-2">
                            Your CV will be used alongside the interview to provide a comprehensive evaluation
                          </p>
                        </div>
                    </div>
                  )}

                    {/* Step 4: Ready to Start */}
                    {currentStep === 4 && (
                      <div className="space-y-8 text-center">
                        <div className="space-y-4">
                          <h2 className="text-4xl font-bold text-gray-900">
                            Ready to Start!
                          </h2>
                          <p className="text-lg text-gray-600">
                            Choose how you'd like to begin your interview
                            experience
                          </p>
                </div>
                        <div className="max-w-md mx-auto space-y-4">
                   <AlertDialog>
                     <AlertDialogTrigger asChild>
                       <Button
                                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                         disabled={
                           isLoadingPractice || isLoadingInterview ||
                           (!interview?.is_anonymous && (!isValidEmail || !name))
                         }
                       >
                                <PlayIcon className="mr-3 h-6 w-6" />
                                {isLoadingInterview ? <MiniLoader /> : "Start Interview"}
                       </Button>
                     </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white/95 backdrop-blur-xl border border-white/20">
                       <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold text-gray-900">Start Interview Directly?</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-600 text-lg">
                           Are you sure you want to start the interview without practicing? We recommend taking the short practice session first.
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl px-6 py-3">Cancel</AlertDialogCancel>
                         <AlertDialogAction
                                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl px-6 py-3 font-semibold"
                           onClick={() => prepareToStartConversation(false)}
                         >
                           Continue to Interview
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                   </AlertDialog>

                  <Button
                            onClick={() => prepareToStartConversation(true)}
                    variant="outline"
                            className="w-full border-2 border-blue-300 text-blue-700 hover:bg-blue-50 py-4 text-lg rounded-xl hover:border-blue-400 transition-all duration-300 transform hover:scale-105 font-semibold"
                    disabled={
                      isLoadingPractice || isLoadingInterview ||
                      (!interview?.is_anonymous && (!isValidEmail || !name))
                    }
                  >
                            <BookOpenIcon className="mr-3 h-6 w-6" />
                    {isLoadingPractice ? <MiniLoader /> : "Start Practice"}
                  </Button>
                </div>
              </div>
            )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-sm border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={handlePrevStep}
                        variant="ghost"
                        disabled={currentStep === 1}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Back
                      </Button>

                      {currentStep < 4 ? (
                        <Button
                          onClick={handleNextStep}
                          disabled={!canProceedFromStep(currentStep)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                          Next →
                        </Button>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Choose your option above
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Interview Session or End States
              <>
                {/* Interview Active View (Real or Practice) */}
                {isStarted && !isEnded && !isOldUser && (
                  <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
                    {/* Header */}
                    {isPracticing && (
                      <div className="bg-yellow-100 border-b border-yellow-200 px-6 py-3">
                        <div className="flex items-center justify-center space-x-2 text-sm">
                          <ClockIcon className="w-4 h-4 text-yellow-700" />
                          <span className="text-yellow-800 font-medium">
                            Practice Time: {formatTime(practiceTimeLeft)}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-yellow-300 text-yellow-700 bg-yellow-50"
                          >
                            Practice Session - Not Recorded
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar for Real Interview */}
                    {!isPracticing && (
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            Interview Progress
                          </span>
                          <span className="text-sm text-gray-500">
                            {Math.round((Number(currentTimeDuration) / (Number(interviewTimeDuration) * 60)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${
                                    (Number(currentTimeDuration) /
                                      (Number(interviewTimeDuration) * 60)) *
                                    100
                                  }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Candidate Name */}
                    <div className="text-center py-6">
                      <h1 className="text-2xl font-semibold text-gray-900">
                        {interview?.name}{" "}
                        {isPracticing && <span className="text-gray-500">(Practice)</span>}
                      </h1>
                    </div>

                    {/* Conversation Area */}
                    <div className="flex-1 px-6 py-8">
                      <div className="max-w-4xl mx-auto">
                        {/* Conversation Layout */}
                        <div className="grid grid-cols-2 gap-12 h-[400px] items-center relative overflow-hidden">
                          {/* Subtle Divider */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent transform -translate-x-1/2"></div>

                          {/* AI Interviewer Side (Left) */}
                          <div className="flex items-center justify-start h-full pr-6 overflow-hidden">
                            <p className={`${
                              lastInterviewerResponse && lastInterviewerResponse.length > 300 
                                ? 'text-lg' 
                                : lastInterviewerResponse && lastInterviewerResponse.length > 200 
                                ? 'text-xl' 
                                : lastInterviewerResponse && lastInterviewerResponse.length > 100 
                                ? 'text-2xl' 
                                : 'text-3xl'
                            } text-gray-900 leading-relaxed font-bold text-left break-words`}>
                              {lastInterviewerResponse}
                            </p>
                          </div>

                          {/* User Response Side (Right) */}
                          <div className="flex items-center justify-start h-full pl-6 overflow-hidden">
                            <p className={`${
                              lastUserResponse && lastUserResponse.length > 300 
                                ? 'text-lg' 
                                : lastUserResponse && lastUserResponse.length > 200 
                                ? 'text-xl' 
                                : lastUserResponse && lastUserResponse.length > 100 
                                ? 'text-2xl' 
                                : 'text-3xl'
                            } text-gray-900 leading-relaxed font-bold text-left break-words`}>
                              {lastUserResponse}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="px-6 pb-8">
                      <div className="max-w-4xl mx-auto">
                        <div className="flex items-end justify-between">
                          {/* Interviewer */}
                          <div className="flex flex-col items-center space-y-3">
                            <div className="relative">
                      <Image
                                src={interviewerImg || "/default-avatar.png"}
                        alt="Image of the interviewer"
                                width={64}
                                height={64}
                                className={`object-cover object-center rounded-full border-2 ${
                          activeTurn === "agent"
                                    ? "border-blue-300"
                                    : "border-gray-200"
                        }`}
                      />
                    </div>
                            <span className="text-sm font-medium text-gray-700">
                              Interviewer
                            </span>
                  </div>

                          {/* Candidate */}
                          <div className="flex flex-col items-center space-y-3">
                            <div className="relative">
                              <div
                                className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 ${
                                  activeTurn === "user"
                                    ? "border-blue-300"
                                    : isMuted 
                                    ? "border-red-300" 
                                    : "border-green-300"
                                } ${
                                  isMuted 
                                    ? "bg-red-100 text-red-600" 
                                    : "bg-green-100 text-green-600"
                                }`}
                              >
                                {name ? name.charAt(0).toUpperCase() : 'U'}
                    </div>

                              {/* Microphone Status */}
                              <div
                                className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center ${
                                  isMuted ? "bg-red-500" : "bg-green-500"
                                }`}
                      >
                        {isMuted ? (
                                  <MicOffIcon className="w-4 h-4 text-white" />
                        ) : (
                                  <MicIcon className="w-4 h-4 text-white" />
                        )}
                    </div>
                  </div>
                            <span className="text-sm font-medium text-gray-700">You</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-white border-t px-6 py-4">
                      <div className="max-w-4xl mx-auto flex items-center justify-center space-x-4 relative">
                        {/* Mute Guide */}
                        {showMuteGuide && (
                          <div className="absolute -top-12 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg animate-pulse">
                            Click to unmute and speak
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                          </div>
                        )}
                        <Button
                          onClick={toggleMute}
                          variant={isMuted ? "destructive" : "default"}
                          size="lg"
                          className={`rounded-full w-12 h-12 p-0 ${
                            isMuted
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-green-500 hover:bg-green-600"
                          }`}
                        >
                          {isMuted ? (
                            <MicOffIcon className="w-5 h-5" />
                          ) : (
                            <MicIcon className="w-5 h-5" />
                          )}
                        </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button
                              variant="destructive"
                              className="bg-red-500 hover:bg-red-600"
                         >
                              <PhoneOffIcon className="mr-2 w-4 h-4" />
                              End {isPracticing ? "Practice" : "Interview"}
                         </Button>
                      </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                           <AlertDialogDescription>
                             {isPracticing
                               ? "This will end the practice session."
                               : "This action cannot be undone. This will end the interview."}
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                           <AlertDialogAction
                             className="bg-red-600 hover:bg-red-800"
                                onClick={handleEndCall}
                           >
                              {isPracticing ? "End Practice" : "End Interview"}
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-100 px-6 py-3">
                      <div className="text-center text-sm text-gray-500">
                        Powered by{" "}
                        <span className="text-orange-600 font-semibold">RapidScreen</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Old User View */}
            {isOldUser && (
                  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
                 <XCircleIcon className="h-16 w-16 text-red-500 mb-4" />
                 <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                 <p className="text-center text-gray-600 mb-4 max-w-md">
                   {interview?.is_anonymous
                     ? "This interview has already been completed from this browser session."
                     : "You have already responded to this interview, or the email provided is not permitted to respond."}
                 </p>
                 <p className="text-center text-gray-600">
                   Please contact the sender if you believe this is an error.
                 </p>
               </div>
            )}

                {/* End View (After Real Call) */}
            {isEnded && !isOldUser && !isPracticing && (
                  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
                <p className="text-center text-gray-600 mb-6 max-w-md">
                  Your response has been submitted. You may now close this window.
                </p>
                    {!isFeedbackSubmitted && (
                  <>
                    <p className="text-center text-gray-600 mb-4 max-w-md">
                      We&apos;d love to hear your feedback on the interview
                      experience.
                    </p>
                    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="bg-orange-500 hover:bg-orange-700 text-white"
                          style={{
                            backgroundColor: interview.theme_color ?? "#f97316",
                            color: isLightColor(interview.theme_color ?? "#f97316")
                              ? "black"
                              : "white",
                          }}
                        >
                          Provide Feedback
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Feedback</AlertDialogTitle>
                        </AlertDialogHeader>
                        <FeedbackForm email={!interview?.is_anonymous ? email : undefined} onSubmit={handleFeedbackSubmit} />
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}

                {/* End View (After Practice Call) */}
            {isEnded && isPracticing && (
                  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 py-8">
                <CheckCircleIcon className="h-16 w-16 text-orange-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Practice Ended</h1>
                <p className="text-center text-gray-600 mb-6 max-w-md">
                   You have completed the practice session. Please enter your details below if required, then start the actual interview or exit.
                 </p>

                 {/* Action Buttons After Practice */}
                 <div className="flex space-x-4">
                    <Button
                       className="flex-1 h-10 rounded-lg"
                       style={{
                         backgroundColor: interview.theme_color ?? "#f97316",
                         color: isLightColor(interview.theme_color ?? "#f97316")
                           ? "black"
                           : "white",
                       }}
                       disabled={isLoadingInterview || (!interview?.is_anonymous && (!isValidEmail || !name))}
                       onClick={() => {
                           console.log("[Practice Ended Button Click] Attempting to start real interview...");
                           setIsEnded(false);
                           setIsPracticing(false);
                           setIsStarted(false);
                           setLastInterviewerResponse("");
                           setLastUserResponse("");
                           setCallId("");
                          setCurrentStep(4); // Go back to step 4 (ready to start)
                       }}
                     >
                       {isLoadingInterview ? <MiniLoader/> : "Start Interview"}
                    </Button>
                 </div>
               </div>
                )}
              </>
            )}

            {/* Footer - Outside the card */}
            <div className="text-center mt-6">
              <p className="text-sm text-white/80">
            Powered by{" "}
                <span className="font-bold text-orange-400">RapidScreen</span>
              </p>
          </div>
          </div>
        </div>
      </div>

        {/* --- Unmute Instruction Popup --- */}
        <AlertDialog open={showUnmuteInstruction} onOpenChange={setShowUnmuteInstruction}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Microphone Muted</AlertDialogTitle>
              <AlertDialogDescription>
                Your microphone starts muted. Click the
                <span className="inline-flex items-center mx-1 p-0.5 rounded bg-gray-200">
                  <MicOffIcon className="h-3 w-3 mr-0.5"/> Unmute
                </span>
              button to speak during the interview.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {
                setShowUnmuteInstruction(false);
                executeStartConversation();
              }}>
                Got it!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

export default Call;
