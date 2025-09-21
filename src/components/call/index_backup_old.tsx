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
  MicOff,
  Mic,
  PhoneOff,
  PhoneOffIcon,
  UserIcon,
  PlayIcon,
  BookOpenIcon,
  LinkedinIcon,
  GithubIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useResponses } from "@/contexts/responses.context";
import Image from "next/image";
import axios from "axios";
import { RetellWebClient } from "retell-client-js-sdk";
import MiniLoader from "../loaders/mini-loader/miniLoader";
import { toast } from "sonner";
import { isLightColor, testEmail } from "@/lib/utils";
import { ResponseService } from "@/services/responses.service";
import { Interview } from "@/types/interview";
import { FeedbackData } from "@/types/response";
import { FeedbackService } from "@/services/feedback.service";
import { FeedbackForm } from "@/components/call/feedbackForm";
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
import { Edit2 } from 'lucide-react';

const webClient = new RetellWebClient();

type InterviewProps = {
  interview: Interview;
};

type registerCallResponseType = {
  data: {
    registerCallResponse: {
      call_id: string;
      access_token: string;
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
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [isValidEmail, setIsValidEmail] = useState<boolean>(false);
  const [isOldUser, setIsOldUser] = useState<boolean>(false);
  const [callId, setCallId] = useState<string>("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { tabSwitchCount } = useTabSwitchPrevention();
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interviewerImg, setInterviewerImg] = useState("");
  const [interviewTimeDuration, setInterviewTimeDuration] =
    useState<string>("1");
  const [time, setTime] = useState(0);
  const [currentTimeDuration, setCurrentTimeDuration] = useState<string>("0");
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState<boolean>(false);
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

  // --- Unmute Instruction State ---
  const [showUnmuteInstruction, setShowUnmuteInstruction] = useState(false);
  // --- End Unmute Instruction State ---

  // --- State to hold args for delayed start ---
  const [startFunctionArgs, setStartFunctionArgs] = useState<{ practiceMode: boolean } | null>(null);
  // --- End State ---

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
    // Only auto-end based on interview duration if NOT practicing
    if (
      !isPracticing &&
      Number(currentTimeDuration) == Number(interviewTimeDuration) * 60
    ) {
      webClient.stopCall();
      setIsEnded(true);
    }

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
      webClient.stopCall(); // Stop call when practice timer ends
      // `isEnded` will be set by the 'call_ended' event listener
      // endPractice(); // Don't call endPractice here, let call_ended handle state
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

  // --- Retell Event Listeners ---
  useEffect(() => {
    webClient.on("call_started", () => {
      console.log("Call started (practice:", isPracticing, ")");
      setIsCalling(true);
      // Explicitly mute mic on call start
      webClient.mute();
    });

    const persistEnd = async () => {
      try {
        if (hasSavedRef.current) return;
        if (isPracticing) return;
        if (!callId) return;
        hasSavedRef.current = true;
        console.log("[persistEnd] Persisting end of interview for callId:", callId);
        await ResponseService.saveResponse(
          {
            is_ended: true,
            tab_switch_count: tabSwitchCount,
            interview_id: interview.id,
            email,
            name,
            profile_id: session?.user?.linkedinId || null,
            profile_type: session?.user?.linkedinId ? 'linkedin' : null,
          },
          callId,
        );
        console.log("[persistEnd] Persisted successfully for callId:", callId);
      } catch (error) {
        console.error("[persistEnd] Failed to persist end:", error);
      }
    };

    webClient.on("call_ended", () => {
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

    webClient.on("agent_start_talking", () => {
      setActiveTurn("agent");
    });

    webClient.on("agent_stop_talking", () => {
      setActiveTurn("user");
    });

    webClient.on("error", (error) => {
      console.error("An error occurred:", error);
      webClient.stopCall(); // Ensure call stops on error
      setIsEnded(true);
      setIsCalling(false);
    });

    webClient.on("update", (update) => {
      if (update.transcript) {
        const transcripts: transcriptType[] = update.transcript;
        const roleContents: { [key: string]: string } = {};

        transcripts.forEach((transcript) => {
          roleContents[transcript?.role] = transcript?.content;
        });

        setLastInterviewerResponse(roleContents["agent"]);
        setLastUserResponse(roleContents["user"]);
      }
    });

    return () => {
      webClient.removeAllListeners();
    };
    // isPracticing dependency added to ensure listeners have correct state context if needed, although current listeners don't use it directly.
  }, [isPracticing]);

  // --- End Call / End Practice Handler ---
  const handleEndCall = async () => {
    console.log("handleEndCall triggered (practice:", isPracticing, ")");
    webClient.stopCall();
    // isEnded will be set by the 'call_ended' listener
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

      // --- CV Upload Logic ---
      let cvUrl: string | null = null;
      if (cvFile && !practiceMode) { // Only upload if file exists and it's not practice mode
        console.log("[executeStartConversation] Uploading CV...");
        const supabase = createClientComponentClient(); // Create client instance
        const fileExt = cvFile.name.split('.').pop();
        const uniqueFileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${interview.id}/${uniqueFileName}`; // Store under interview ID folder

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cvs') // Target 'cvs' bucket
          .upload(filePath, cvFile);

        if (uploadError) {
          console.error("[executeStartConversation] CV Upload Error:", uploadError);
          toast.error("Failed to upload CV. Please try again or continue without it.");
          // Decide if you want to stop the process or continue without CV
          // For now, we'll let it continue without the CV
          // throw new Error("CV upload failed"); // Alternatively, stop the process
        } else {
          console.log("[executeStartConversation] CV Upload successful:", uploadData);
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('cvs')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            cvUrl = publicUrlData.publicUrl;
            console.log("[executeStartConversation] CV Public URL:", cvUrl);
          } else {
            console.warn("[executeStartConversation] Could not get public URL for CV.");
            // Handle case where URL retrieval fails but upload succeeded (optional)
          }
        }
      } else if (cvFile && practiceMode) {
        console.log("[executeStartConversation] Practice mode: Skipping CV upload.");
      }

      // --- Prepare data for Retell API ---
      const data = {
        mins: practiceMode ? "2" : interview?.time_duration,
        objective: interview?.objective,
        questions: interview?.questions.map((q) => q.question).join(", "),
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
        console.log(`[executeStartConversation] Got access token. Call ID: ${currentCallId}`);
        setCallId(currentCallId);

        // --- Create Database Record (Real Interviews Only) ---
        if (!practiceMode) {
          console.log("[executeStartConversation] Creating DB record with CV URL:", cvUrl);
          const newResponseId = await createResponse({
            interview_id: interview.id,
            call_id: currentCallId,
            email: userEmail,
            name: userName,
            cv_url: cvUrl,
            profile_id: session?.user?.linkedinId || null,
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

        // --- Start Retell Call ---
        console.log("[executeStartConversation] Starting Retell web client call...");
        await webClient.startCall({
          accessToken: registerCallResponse.data.registerCallResponse.access_token,
        });
        console.log("[executeStartConversation] Retell call initiated. Setting isStarted = true");
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

  // --- Save Response Effect ---
  useEffect(() => {
    // Only save response if the call has ended AND it was NOT a practice session
    if (isEnded && callId && !isPracticing) {
      console.log("Real interview ended. Saving response.");
      const updateResponse = async () => {
        try {
          await ResponseService.saveResponse(
            {
              is_ended: true,
              tab_switch_count: tabSwitchCount,
              // also persist primary identifiers in case initial insert failed
              interview_id: interview.id,
              email,
              name,
              profile_id: session?.user?.linkedinId || null,
              profile_type: session?.user?.linkedinId ? 'linkedin' : null,
            },
            callId,
          );
          console.log("Response saved successfully for callId:", callId);
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
    if (newMutedState) {
      webClient.mute();
    } else {
      webClient.unmute();
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
        console.log("Initial microphone permission state:", permissionStatus.state);

        permissionStatus.onchange = () => {
          setMicPermissionStatus(permissionStatus.state);
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

  // --- Helper for file input change ---
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setCvFile(file);
    } else if (file) {
      // Optional: Provide feedback if the file is not a PDF
      toast.error("Please upload a PDF file.");
      setCvFile(null); // Clear selection if not PDF
      event.target.value = ""; // Reset file input
    } else {
      setCvFile(null); // Clear state if no file selected
    }
  };
  // --- End Helper ---

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full Page Interstellar Background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, #00223e, #ffa17f)",
        }}
      >
        {/* Stars Universe - Full Page */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated stars effect */}
          <div className="absolute inset-0">
            {[...Array(200)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-white rounded-full opacity-80 animate-pulse"
                style={{
                  width: Math.random() * 4 + 1 + 'px',
                  height: Math.random() * 4 + 1 + 'px',
                  left: Math.random() * 100 + '%',
                  top: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 3 + 's',
                  animationDuration: (Math.random() * 3 + 2) + 's'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {isStarted && !isPracticing && !isEnded && <TabSwitchWarning />}
      
      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-3xl">

          {/* --- Progress Bar (Real Interview Only) --- */}
          {isStarted && !isEnded && !isPracticing && (
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

           {/* --- Practice Timer Display --- */}
           {isPracticing && isStarted && !isEnded && ( // Show only during active practice
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

          <div>
            <CardHeader className="items-center p-1 pt-3"> {/* Added pt-3 */}
              {/* Show title when not ended */}
              {!isEnded && (
                <CardTitle className="flex flex-row items-center text-lg md:text-xl font-bold mb-2">
                  {interview?.name} {isPracticing && <span className="text-sm font-normal text-gray-500 ml-2">(Practice)</span>}
                </CardTitle>
              )}
              {/* Show duration when not practicing and not ended */}
              {!isEnded && !isPracticing && (
                <div className="flex mt-2 flex-row">
                  <AlarmClockIcon
                    className="text-orange-500 h-[1rem] w-[1rem] rotate-0 scale-100  dark:-rotate-90 dark:scale-0 mr-2 font-bold"
                    style={{ color: interview.theme_color }}
                  />
                  <div className="text-sm font-normal">
                    Expected duration:{" "}
                    <span
                      className="font-bold"
                      style={{ color: interview.theme_color }}
                    >
                      {interviewTimeDuration} mins{" "}
                    </span>
                    or less
                  </div>
                </div>
              )}
            </CardHeader>

            {/* --- Initial Setup View (Before Start) --- */}
            {!isStarted && !isEnded && !isOldUser && (
              <div className="flex min-h-[600px]">
                {/* Left Half - Info */}
                <div className="flex-1 flex flex-col justify-center p-12 text-white">
                  <div className="max-w-2xl">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mb-8 shadow-2xl">
                      <UserIcon className="w-8 h-8 text-white" />
                    </div>

                    {/* Title */}
                    <h1 className="text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                      {interview?.name || 'Interview'}
                    </h1>

                    <div className="flex items-center text-2xl text-blue-200 mb-6">
                      <ClockIcon className="w-8 h-8 mr-4" />
                      Expected duration: {interviewTimeDuration} mins or less
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

                {/* Right Half - Setup Form */}
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="w-full max-w-2xl">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:shadow-3xl min-h-[600px] flex flex-col">
                      {/* Setup Content Container */}
                      <div className="flex-1 p-10 relative overflow-hidden">
                        {/* Full page gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 rounded-3xl"></div>

                        {/* Setup Content */}
                        <div className="relative z-10 h-full flex flex-col justify-center">
                          {/* Microphone Permission Section */}
                          {micPermissionStatus !== 'granted' ? (
                            <div className="space-y-8 text-center mb-8">
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
                                {(micPermissionStatus === 'prompt' || micPermissionStatus === 'denied' || micPermissionStatus === 'idle') && (
                                  <div className="mt-4 flex justify-center">
                                    <Button
                                      onClick={requestMicPermission}
                                      disabled={micPermissionStatus === 'checking'}
                                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                                        micPermissionStatus === 'granted'
                                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 border-0'
                                          : micPermissionStatus === 'checking'
                                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 border-0 cursor-wait'
                                          : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-200 border-0'
                                      }`}
                                    >
                                      {micPermissionStatus === 'checking' ? (
                                        <>
                                          <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                          <span className="text-sm font-medium">Requesting...</span>
                                        </>
                                      ) : micPermissionStatus === 'granted' ? (
                                        <>
                                          <CheckIcon className="mr-2 h-4 w-4" />
                                          <span className="text-sm font-medium">Access Granted</span>
                                        </>
                                      ) : (
                                        <>
                                          <MicIcon className="mr-2 h-4 w-4" />
                                          <span className="text-sm font-medium">Allow Microphone</span>
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}

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
                          ) : (
                            // Authentication Form - Show when mic is granted
                            <div className="space-y-8 text-center">
                              <div className="space-y-4">
                                <h2 className="text-4xl font-bold text-gray-900">
                                  Sign In
                                </h2>
                                <p className="text-lg text-gray-600">
                                  Connect with LinkedIn or enter your details manually
                                </p>
                              </div>
                              <div className="max-w-md mx-auto space-y-6">
                                {!interview?.is_anonymous && (
                                  <>
                                    {session?.user ? (
                                      // LinkedIn authenticated user - populated read-only
                                      <div className="space-y-4">
                                        {/* LinkedIn Sign-in Indicator */}
                                        <div className="flex justify-center items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077B5">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                          </svg>
                                          <span className="text-sm font-medium text-blue-700">Signed in with LinkedIn</span>
                                          <button
                                            onClick={() => signOut()}
                                            className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
                                          >
                                            Sign out
                                          </button>
                                        </div>

                                        {/* Pre-filled Fields */}
                                        <div className="space-y-4">
                                          <input
                                            value={session.user.name || name}
                                            type="text"
                                            className="w-full bg-gray-50 border-gray-200 py-4 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4"
                                            placeholder="Enter your first name"
                                            disabled
                                            readOnly
                                          />
                                          <input
                                            value={session.user.email || email}
                                            type="email"
                                            className="w-full bg-gray-50 border-gray-200 py-4 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4"
                                            placeholder="Enter your email address"
                                            disabled
                                            readOnly
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      // No LinkedIn session - show sign-in options
                                      <div className="space-y-6">
                                        {/* LinkedIn Sign-in Button */}
                                        <Button
                                          onClick={() => signIn('linkedin')}
                                          className="w-full bg-[#0077B5] hover:bg-[#005885] text-white py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                                        >
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="mr-3">
                                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                          </svg>
                                          Sign in with LinkedIn
                                        </Button>

                                        {/* Divider */}
                                        <div className="flex items-center justify-center gap-3">
                                          <div className="h-px bg-gray-300 flex-1"></div>
                                          <span className="text-sm text-gray-500">or enter manually</span>
                                          <div className="h-px bg-gray-300 flex-1"></div>
                                        </div>

                                        {/* Manual Input Fields */}
                                        <div className="space-y-4">
                                          <input
                                            value={name}
                                            type="text"
                                            className="w-full bg-gray-50 border-gray-200 py-4 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4"
                                            placeholder="Enter your first name"
                                            onChange={(e) => setName(e.target.value)}
                                          />
                                          <input
                                            value={email}
                                            type="email"
                                            className="w-full bg-gray-50 border-gray-200 py-4 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent px-4"
                                            placeholder="Enter your email address"
                                            onChange={(e) => setEmail(e.target.value)}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                                
                                {/* CV Upload Section */}
                                <div className="mt-8">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      Upload CV (Optional, PDF only)
                                    </label>
                                    <div className={`
                                      relative border-2 border-dashed rounded-xl p-6 text-center transition-colors
                                      ${
                                        cvFile
                                          ? "border-green-300 bg-green-50"
                                          : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                                      }
                                    `}>
                                      {cvFile ? (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-sm text-green-700 font-medium">
                                              {cvFile.name}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setCvFile(null)}
                                            className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 rounded-full flex items-center justify-center"
                                          >
                                            <XCircleIcon className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                          </svg>
                                          <div className="text-sm text-gray-600">
                                            <span className="font-medium">Drop your PDF here</span> or{" "}
                                            <label htmlFor="cv-upload" className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                                              browse files
                                            </label>
                                            <input
                                              id="cv-upload"
                                              type="file"
                                              accept=".pdf"
                                              className="hidden"
                                              onChange={handleFileChange}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="mt-12 space-y-4">
                                <div className="max-w-md mx-auto space-y-4">
                                  {/* Start Interview Button (Primary) with Confirmation */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                                        disabled={
                                          micPermissionStatus !== 'granted' ||
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

                                  {/* Start Practice Button (Secondary) */}
                                  <Button
                                    onClick={() => prepareToStartConversation(true)}
                                    variant="outline"
                                    className="w-full border-2 border-blue-300 text-blue-700 hover:bg-blue-50 py-4 text-lg rounded-xl hover:border-blue-400 transition-all duration-300 transform hover:scale-105 font-semibold"
                                    disabled={
                                      micPermissionStatus !== 'granted' ||
                                      isLoadingPractice || isLoadingInterview ||
                                      (!interview?.is_anonymous && (!isValidEmail || !name))
                                    }
                                  >
                                    <BookOpenIcon className="mr-3 h-6 w-6" />
                                    {isLoadingPractice ? <MiniLoader /> : "Start Practice"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
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
            )}

            {/* --- Interview Active View (Real or Practice) --- */}
            {isStarted && !isEnded && !isOldUser && ( // Show if started, not ended, not old user
              <div className="min-h-screen bg-gray-50 flex flex-col"> {/* Main container for active call UI */}
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
                    <div className="grid grid-cols-2 gap-12 min-h-[400px] items-start relative">
                      {/* Subtle Divider */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent transform -translate-x-1/2"></div>

                      {/* AI Interviewer Side (Left) */}
                      <div className="space-y-8 pr-6">
                        <p className="text-3xl text-gray-900 leading-relaxed font-bold">
                          {lastInterviewerResponse}
                        </p>
                      </div>

                      {/* User Response Side (Right) */}
                      <div className="space-y-8 pl-6">
                        <p className="text-3xl text-gray-900 leading-relaxed font-bold text-right">
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
                  <div className="max-w-4xl mx-auto flex items-center justify-center space-x-4">
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

            {/* --- Old User View --- */}
            {isOldUser && (
               <div className="flex flex-col items-center justify-center h-[60vh]">
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

            {/* --- End View (After Real Call) --- */}
            {isEnded && !isOldUser && !isPracticing && (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
                <p className="text-center text-gray-600 mb-6 max-w-md">
                  Your response has been submitted. You may now close this window.
                </p>
                {/* Temporarily remove interview.show_feedback_form check for debugging */}
                {!isFeedbackSubmitted /* && interview.show_feedback_form */ && (
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
                        {/* Pass email only if it exists (was collected) */}
                        <FeedbackForm email={!interview?.is_anonymous ? email : undefined} onSubmit={handleFeedbackSubmit} />
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            )}

             {/* --- End View (After Practice Call) --- */}
            {isEnded && isPracticing && (
              <div className="flex flex-col items-center justify-center h-[auto] min-h-[60vh] py-8"> {/* Adjusted height for inputs */}
                <CheckCircleIcon className="h-16 w-16 text-orange-500 mb-4" />
                <h1 className="text-2xl font-bold mb-2">Practice Ended</h1>
                <p className="text-center text-gray-600 mb-6 max-w-md">
                   You have completed the practice session. Please enter your details below if required, then start the actual interview or exit.
                 </p>

                 {/* --- Conditionally Show Email/Name Inputs --- */}
                 {!interview?.is_anonymous && (
                   <div className="w-full max-w-sm flex flex-col gap-3 mb-6 px-4"> {/* Container for inputs */}
                     {session?.user ? (
                       // LinkedIn authenticated - show populated fields with edit option
                       <div className="space-y-3">
                         <div className="flex items-center gap-2 mb-2">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077B5">
                             <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                           </svg>
                           <span className="text-xs text-gray-600">LinkedIn profile</span>
                         </div>
                         
                         <div className="flex items-center gap-2">
                           <input
                             value={isEditingName ? name : (session.user.name || name)}
                             type="text"
                             className={`h-fit py-2 border-2 rounded-md w-full self-center px-2 text-sm font-normal ${
                               isEditingName 
                                 ? 'border-gray-400 bg-white' 
                                 : 'border-gray-300 bg-gray-100 text-gray-600'
                             }`}
                             placeholder="Enter your first name"
                             disabled={!isEditingName}
                             onChange={(e) => setName(e.target.value)}
                           />
                           <button
                             onClick={() => setIsEditingName(!isEditingName)}
                             className="p-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
                           >
                             <Edit2 size={14} />
                           </button>
                         </div>
                         
                         <div className="flex items-center gap-2">
                           <input
                             value={isEditingEmail ? email : (session.user.email || email)}
                             type="email"
                             className={`h-fit py-2 border-2 rounded-md w-full self-center px-2 text-sm font-normal ${
                               isEditingEmail 
                                 ? 'border-gray-400 bg-white' 
                                 : 'border-gray-300 bg-gray-100 text-gray-600'
                             }`}
                             placeholder="Enter your email address"
                             disabled={!isEditingEmail}
                             onChange={(e) => setEmail(e.target.value)}
                           />
                           <button
                             onClick={() => setIsEditingEmail(!isEditingEmail)}
                             className="p-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
                           >
                             <Edit2 size={14} />
                           </button>
                         </div>
                       </div>
                     ) : (
                       // No LinkedIn session - show manual inputs
                       <div className="space-y-3">
                         <input
                           value={name}
                           type="text"
                           className="h-fit py-2 border-2 rounded-md w-full self-center px-2 border-gray-400 text-sm font-normal"
                           placeholder="Enter your first name"
                           onChange={(e) => setName(e.target.value)}
                         />
                         <input
                           value={email}
                           type="email"
                           className="h-fit py-2 border-2 rounded-md w-full self-center px-2 border-gray-400 text-sm font-normal"
                           placeholder="Enter your email address"
                           onChange={(e) => setEmail(e.target.value)}
                         />
                       </div>
                     )}
                   </div>
                 )}
                 {/* --- End Email/Name Inputs --- */}

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
                           prepareToStartConversation(false);
                       }}
                     >
                       {isLoadingInterview ? <MiniLoader/> : "Start Interview"}
                    </Button>
                 </div>
               </div>
             )}

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
                button
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {/* Call execute function on dismiss */}
              <AlertDialogAction onClick={() => {
                setShowUnmuteInstruction(false);
                // Use a short delay to allow state update before execution?
                // Or trust React batching? Let's try without delay first.
                executeStartConversation();
              }}>
                Got it!
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* --- End Unmute Instruction Popup --- */}
    </div>
  );
}

export default Call;
