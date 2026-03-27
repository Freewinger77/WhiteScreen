"use client";

import {
  XCircleIcon,
  CheckCircleIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  MessageSquare,
  X,
  Loader2,
  Volume2,
  LinkedinIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useResponses } from "@/contexts/responses.context";
import Image from "next/image";
import axios from "axios";
import Vapi from "@vapi-ai/web";
import { toast } from "sonner";
import { isLightColor, testEmail, cn } from "@/lib/utils";
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
import { signIn, signOut, useSession } from 'next-auth/react';

const vapiClient = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "");

// Default Alex avatar - professional AI interviewer
const DEFAULT_INTERVIEWER_IMAGE = "/interviewers/Alex.png";
const DEFAULT_INTERVIEWER_NAME = "Alex";

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

// ==================== PRE-CALL LOBBY ====================
const PreCallLobby: React.FC<{
  interviewName: string;
  interviewerName: string;
  interviewerImage: string;
  candidateName: string;
  candidateEmail: string;
  isAnonymous: boolean;
  onJoinCall: () => void;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  isConnecting: boolean;
  organizationLogo?: string | null;
}> = ({
  interviewName,
  interviewerName,
  interviewerImage,
  candidateName,
  candidateEmail,
  isAnonymous,
  onJoinCall,
  onNameChange,
  onEmailChange,
  isConnecting,
  organizationLogo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    mics: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ cameras: [], mics: [], speakers: [] });
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showDetails, setShowDetails] = useState(!isAnonymous);
  const isValidEmail = testEmail(candidateEmail);
  const canJoin = isAnonymous || (candidateName && isValidEmail);

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const cameras = deviceList.filter(d => d.kind === "videoinput");
        const mics = deviceList.filter(d => d.kind === "audioinput");
        const speakers = deviceList.filter(d => d.kind === "audiooutput");
        
        setDevices({ cameras, mics, speakers });
        if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
        if (mics.length > 0) setSelectedMic(mics[0].deviceId);
        if (speakers.length > 0) setSelectedSpeaker(speakers[0].deviceId);
      } catch (error) {
        console.error("Error getting devices:", error);
      }
    };
    getDevices();
  }, []);

  // Start video preview
  useEffect(() => {
    const startVideo = async () => {
      if (!isVideoOn) {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        setHasVideo(false);
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCamera ? { deviceId: selectedCamera } : true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasVideo(true);
        }
      } catch (error) {
        console.error("Error starting video:", error);
        setHasVideo(false);
      }
    };
    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedCamera, isVideoOn]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          {organizationLogo ? (
            <Image src={organizationLogo} alt="Logo" width={32} height={32} className="rounded-lg" />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
          )}
          <span className="font-semibold text-gray-900 text-lg">rapidscreen</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="flex gap-12 items-start max-w-5xl w-full">
          {/* Video Preview */}
          <div className="flex-1">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-[4/3] shadow-2xl">
              {hasVideo ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-4xl font-semibold text-gray-400">
                      {candidateName?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Name overlay */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm">
                  {candidateName || "You"}
                </span>
                <span className="text-white/70">•••</span>
              </div>
            </div>

            {/* Device Selection */}
            <div className="flex gap-2 mt-4 flex-wrap">
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="flex-1 min-w-[150px] appearance-none bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors truncate"
              >
                {devices.cameras.map(cam => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    📷 {cam.label || "Camera"}
                  </option>
                ))}
              </select>

              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                className="flex-1 min-w-[150px] appearance-none bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors truncate"
              >
                {devices.mics.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    🎤 {mic.label || "Microphone"}
                  </option>
                ))}
              </select>

              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="flex-1 min-w-[150px] appearance-none bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors truncate"
              >
                {devices.speakers.map(speaker => (
                  <option key={speaker.deviceId} value={speaker.deviceId}>
                    🔊 {speaker.label || "Speaker"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Join Panel */}
          <div className="w-80 flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6">
              Ready to join?
            </h1>
            
            {/* AI Avatar */}
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-violet-100 shadow-lg">
                <Image
                  src={interviewerImage}
                  alt={interviewerName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            
            <p className="text-gray-600 mb-6">
              <span className="font-medium text-gray-900">{interviewerName}</span> is in the call
            </p>

            {/* Name/Email Input (if not anonymous) */}
            {!isAnonymous && (
              <div className="w-full space-y-3 mb-6">
                <Input
                  placeholder="Your name"
                  value={candidateName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full text-center"
                />
                <Input
                  type="email"
                  placeholder="Your email"
                  value={candidateEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  className="w-full text-center"
                />
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={onJoinCall}
              disabled={isConnecting || !canJoin}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-lg font-medium text-base shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:shadow-violet-300 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Join call"
              )}
            </Button>

            {!canJoin && !isAnonymous && (
              <p className="text-sm text-red-500 mt-2">
                Please enter your name and a valid email
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-3 text-center text-sm text-gray-500">
        {interviewName}
      </footer>
    </div>
  );
};

// ==================== ACTIVE CALL UI ====================
const ActiveCallUI: React.FC<{
  interviewName: string;
  interviewerName: string;
  interviewerImage: string;
  candidateName: string;
  isMuted: boolean;
  activeTurn: string;
  lastInterviewerResponse: string;
  lastUserResponse: string;
  onEndCall: () => void;
  onToggleMute: () => void;
  isPracticing?: boolean;
  practiceTimeLeft?: number;
}> = ({
  interviewName,
  interviewerName,
  interviewerImage,
  candidateName,
  isMuted,
  activeTurn,
  lastInterviewerResponse,
  lastUserResponse,
  onEndCall,
  onToggleMute,
  isPracticing,
  practiceTimeLeft,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Format practice time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start video
  useEffect(() => {
    const startVideo = async () => {
      if (!isVideoOn) {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
        setHasVideo(false);
        return;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasVideo(true);
        }
      } catch (error) {
        console.error("Error starting video:", error);
        setHasVideo(false);
      }
    };
    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVideoOn]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastInterviewerResponse, lastUserResponse]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex">
      {/* Practice Mode Banner */}
      {isPracticing && (
        <div className="absolute top-0 left-0 right-0 bg-amber-500 text-black text-center py-2 z-50 font-medium">
          🎯 Practice Mode - {formatTime(practiceTimeLeft || 0)} remaining (Not recorded)
        </div>
      )}

      {/* Main Video Area */}
      <div className={cn("flex-1 relative", isPracticing && "pt-10")}>
        {/* Candidate Video (Full Screen) */}
        <div className="absolute inset-0">
          {hasVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-5xl font-semibold text-gray-400">
                  {candidateName?.[0]?.toUpperCase() || "?"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Candidate Name Overlay */}
        <div className="absolute bottom-24 left-6 flex items-center gap-2">
          <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
            {candidateName || "You"}
          </span>
          {!isMuted && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-green-500 rounded-full animate-pulse delay-75" />
              <div className="w-1 h-2 bg-green-500 rounded-full animate-pulse delay-150" />
            </div>
          )}
        </div>

        {/* AI Interviewer Avatar (Bottom Right) */}
        <div className="absolute bottom-24 right-6">
          <div className={cn(
            "relative w-36 h-36 rounded-2xl overflow-hidden shadow-2xl transition-all bg-gradient-to-br from-violet-100 to-purple-100",
            activeTurn === "agent" && "ring-4 ring-violet-500 ring-opacity-75"
          )}>
            <Image
              src={interviewerImage}
              alt={interviewerName}
              fill
              className="object-cover"
            />
            {/* Name tag */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="text-white text-sm font-medium bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                {interviewerName}
              </span>
              {activeTurn === "agent" && (
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-2 bg-violet-400 rounded-full animate-pulse" />
                  <div className="w-1 h-3 bg-violet-400 rounded-full animate-pulse delay-75" />
                  <div className="w-1 h-2 bg-violet-400 rounded-full animate-pulse delay-150" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="flex items-center justify-center gap-4">
            {/* Mute Button */}
            <Button
              onClick={onToggleMute}
              className={cn(
                "w-14 h-14 rounded-full transition-all shadow-lg",
                isMuted 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicOffIcon className="w-6 h-6 text-white" />
              ) : (
                <MicIcon className="w-6 h-6 text-white" />
              )}
            </Button>

            {/* Video Toggle */}
            <Button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={cn(
                "w-14 h-14 rounded-full transition-all shadow-lg",
                !isVideoOn 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
              title={isVideoOn ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoOn ? (
                <VideoIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoOffIcon className="w-6 h-6 text-white" />
              )}
            </Button>

            {/* End Call Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-lg"
                  title="End call"
                >
                  <PhoneOffIcon className="w-6 h-6 text-white" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End {isPracticing ? "Practice" : "Interview"}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isPracticing 
                      ? "This will end the practice session."
                      : "This action cannot be undone. This will end the interview."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={onEndCall}
                  >
                    End {isPracticing ? "Practice" : "Interview"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Transcript Toggle */}
            <Button
              onClick={() => setShowTranscript(!showTranscript)}
              className={cn(
                "w-14 h-14 rounded-full transition-all shadow-lg",
                showTranscript 
                  ? "bg-violet-600 hover:bg-violet-700" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
              title={showTranscript ? "Hide transcript" : "Show transcript"}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </Button>
          </div>

          {/* Mute hint */}
          {isMuted && (
            <p className="text-center text-white/70 text-sm mt-3 animate-pulse">
              🎤 Click the microphone button to unmute and speak
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-0 left-6 py-2 text-white/60 text-sm">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {interviewName}
        </div>
      </div>

      {/* Live Transcript Panel */}
      {showTranscript && (
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Live Transcript</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {lastInterviewerResponse && (
              <div className="space-y-1">
                <span className="text-sm font-semibold text-violet-600">{interviewerName}</span>
                <p className="text-gray-700 text-sm leading-relaxed bg-violet-50 p-3 rounded-lg">
                  {lastInterviewerResponse}
                </p>
              </div>
            )}
            
            {lastUserResponse && (
              <div className="space-y-1">
                <span className="text-sm font-semibold text-gray-900">{candidateName || "You"}</span>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-100 p-3 rounded-lg">
                  {lastUserResponse}
                </p>
              </div>
            )}
            
            {!lastInterviewerResponse && !lastUserResponse && (
              <div className="text-center text-gray-400 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Transcript will appear here...</p>
              </div>
            )}
            
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN CALL COMPONENT ====================
function Call({ interview }: InterviewProps) {
  const { createResponse } = useResponses();
  const { data: session } = useSession();
  
  // State
  const [lastInterviewerResponse, setLastInterviewerResponse] = useState("");
  const [lastUserResponse, setLastUserResponse] = useState("");
  const [activeTurn, setActiveTurn] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [callId, setCallId] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isOldUser, setIsOldUser] = useState(false);
  const [interviewerImg, setInterviewerImg] = useState(DEFAULT_INTERVIEWER_IMAGE);
  const [interviewerName, setInterviewerName] = useState(DEFAULT_INTERVIEWER_NAME);
  const [organizationLogo, setOrganizationLogo] = useState<string | null>(null);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Practice mode
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceTimeLeft, setPracticeTimeLeft] = useState(120);
  const practiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Tab switch tracking
  const { tabSwitchCount, tabSwitchEvents } = useTabSwitchPrevention({ 
    isTracking: isCalling && !isPracticing
  });
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const tabSwitchEventsRef = useRef(tabSwitchEvents);
  
  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
    tabSwitchEventsRef.current = tabSwitchEvents;
  }, [tabSwitchCount, tabSwitchEvents]);
  
  const hasSavedRef = useRef(false);

  // Fetch interviewer image
  useEffect(() => {
    const fetchInterviewer = async () => {
      try {
        const interviewer = await InterviewerService.getInterviewer(interview.interviewer_id);
        if (interviewer?.image) setInterviewerImg(interviewer.image);
        if (interviewer?.name) setInterviewerName(interviewer.name);
      } catch (error) {
        console.error("Error fetching interviewer:", error);
      }
    };
    fetchInterviewer();
  }, [interview.interviewer_id]);

  // Fetch organization logo
  useEffect(() => {
    const fetchOrgLogo = async () => {
      if (!isCustomLogoUpload(interview.logo_url) && interview.organization_id) {
        const logo = await ClientService.getOrganizationLogoById(interview.organization_id);
        setOrganizationLogo(logo);
      }
    };
    fetchOrgLogo();
  }, [interview.organization_id, interview.logo_url]);

  // Auto-populate from session
  useEffect(() => {
    if (session?.user && !interview?.is_anonymous) {
      if (session.user.email) setEmail(session.user.email);
      if (session.user.name) setName(session.user.name);
    }
  }, [session, interview?.is_anonymous]);

  // Practice timer
  useEffect(() => {
    if (isPracticing && isStarted && practiceTimeLeft > 0) {
      practiceIntervalRef.current = setInterval(() => {
        setPracticeTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isPracticing && practiceTimeLeft === 0) {
      vapiClient.stop();
    }

    return () => {
      if (practiceIntervalRef.current) clearInterval(practiceIntervalRef.current);
    };
  }, [isPracticing, practiceTimeLeft, isStarted]);

  // Vapi event listeners
  useEffect(() => {
    let assistantTurnText = "";
    let userTurnText = "";
    let lastSpeaker = "";

    vapiClient.on("call-start", () => {
      setIsCalling(true);
      setIsConnecting(false);
      vapiClient.setMuted(true);
    });

    const persistEnd = async () => {
      if (hasSavedRef.current || isPracticing || !callId) return;
      hasSavedRef.current = true;
      
      try {
        await ResponseService.saveResponse({
          is_ended: true,
          tab_switch_count: tabSwitchCountRef.current,
          tab_switch_events: tabSwitchEventsRef.current.length > 0 ? tabSwitchEventsRef.current : null,
          interview_id: interview.id,
          email,
          name,
        }, callId);
      } catch (error) {
        console.error("Failed to persist end:", error);
      }
    };

    vapiClient.on("call-end", () => {
      setIsCalling(false);
      setIsEnded(true);
      if (practiceIntervalRef.current) clearInterval(practiceIntervalRef.current);
      persistEnd();
    });

    vapiClient.on("speech-start", () => {
      setActiveTurn("agent");
    });

    vapiClient.on("speech-end", () => {
      setActiveTurn("user");
    });

    vapiClient.on("error", (error) => {
      console.error("Vapi error:", error);
      vapiClient.stop();
      setIsEnded(true);
      setIsCalling(false);
    });

    vapiClient.on("message", (message: any) => {
      if (message.type === "transcript") {
        const text = message.transcript || "";
        if (!text) return;
        
        if (message.role === "assistant") {
          if (message.transcriptType === "partial") {
            if (lastSpeaker !== "assistant") {
              assistantTurnText = "";
              lastSpeaker = "assistant";
            }
            setLastInterviewerResponse(assistantTurnText ? assistantTurnText + " " + text : text);
          }
          if (message.transcriptType === "final") {
            assistantTurnText += (assistantTurnText ? " " : "") + text;
            setLastInterviewerResponse(assistantTurnText);
          }
        } else if (message.role === "user") {
          if (message.transcriptType === "partial") {
            if (lastSpeaker !== "user") {
              userTurnText = "";
              lastSpeaker = "user";
            }
            setLastUserResponse(userTurnText ? userTurnText + " " + text : text);
          }
          if (message.transcriptType === "final") {
            userTurnText += (userTurnText ? " " : "") + text;
            setLastUserResponse(userTurnText);
          }
        }
      }
    });

    return () => {
      vapiClient.removeAllListeners();
    };
  }, [isPracticing, callId, interview.id, email, name]);

  // Save response on end
  useEffect(() => {
    if (isEnded && callId && !isPracticing) {
      const save = async () => {
        try {
          await ResponseService.saveResponse({
            is_ended: true,
            tab_switch_count: tabSwitchCountRef.current,
            tab_switch_events: tabSwitchEventsRef.current.length > 0 ? tabSwitchEventsRef.current : null,
            interview_id: interview.id,
            email,
            name,
          }, callId);
        } catch (error) {
          console.error("Failed to save response:", error);
        }
      };
      save();
    }
  }, [isEnded, callId, isPracticing, interview.id, email, name]);

  // Join call handler
  const handleJoinCall = async () => {
    setIsConnecting(true);
    
    const userName = interview?.is_anonymous ? "Anonymous" : name;
    const userEmail = interview?.is_anonymous ? "anonymous@example.com" : email;

    try {
      // Check for existing response
      if (!interview?.is_anonymous) {
        const existingEmails = (await ResponseService.getAllEmails(interview.id)).map(e => e.email);
        if (existingEmails.includes(userEmail)) {
          setIsOldUser(true);
          setIsConnecting(false);
          toast.error("You have already responded to this interview.");
          return;
        }
      }

      // Prepare data
      const data = {
        mins: interview?.time_duration,
        objective: interview?.objective,
        questions: interview?.questions
          ?.map((q, i) => `Question ${i + 1} (follow_up_count: ${q.follow_up_count}): ${q.question}`)
          .join(", "),
        name: userName,
        job_context: interview?.job_context || "",
      };

      // Register call
      const response: registerCallResponseType = await axios.post("/api/register-call", {
        dynamic_data: data,
        interviewer_id: interview?.interviewer_id,
      });

      const tempCallId = response.data.registerCallResponse.call_id;
      setCallId(tempCallId);

      // Create DB record
      const newResponseId = await createResponse({
        interview_id: interview.id,
        call_id: tempCallId,
        email: userEmail,
        name: userName,
      });

      // Start Vapi call
      const assistantId = response.data.registerCallResponse.access_token;
      const call = await vapiClient.start(assistantId, {
        variableValues: response.data.registerCallResponse.dynamic_data,
      });

      // Update with real call ID
      if (call?.id) {
        await ResponseService.updateResponse({ call_id: call.id }, tempCallId);
        setCallId(call.id);
      }

      setIsStarted(true);
    } catch (error) {
      console.error("Error joining call:", error);
      toast.error("Failed to start interview. Please try again.");
      setIsConnecting(false);
    }
  };

  // End call handler
  const handleEndCall = () => {
    vapiClient.stop();
  };

  // Toggle mute
  const handleToggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    vapiClient.setMuted(newState);
  };

  // Feedback handler
  const handleFeedbackSubmit = async (formData: Omit<FeedbackData, "interview_id">) => {
    try {
      const result = await FeedbackService.submitFeedback({
        ...formData,
        interview_id: interview.id,
      });
      if (result) {
        toast.success("Thank you for your feedback!");
        setIsFeedbackSubmitted(true);
        setIsDialogOpen(false);
      }
    } catch (error) {
      toast.error("Failed to submit feedback.");
    }
  };

  // ==================== RENDER ====================
  
  // Old user blocked
  if (isOldUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600">You have already responded to this interview.</p>
        </div>
      </div>
    );
  }

  // Interview ended
  if (isEnded && !isPracticing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Thank you!</h1>
          <p className="text-gray-600 mb-6">
            Your interview has been submitted. You may now close this window.
          </p>
          
          {!isFeedbackSubmitted && (
            <>
              <p className="text-gray-500 mb-4">We'd love to hear your feedback!</p>
              <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    Provide Feedback
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Interview Feedback</AlertDialogTitle>
                  </AlertDialogHeader>
                  <FeedbackForm 
                    email={!interview?.is_anonymous ? email : undefined} 
                    onSubmit={handleFeedbackSubmit} 
                  />
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    );
  }

  // Tab switch warning
  if (isStarted && !isPracticing && !isEnded) {
    // Show tab switch warning overlay when needed
  }

  // Active call
  if (isCalling || isConnecting) {
    return (
      <>
        {isStarted && !isPracticing && !isEnded && <TabSwitchWarning />}
        <ActiveCallUI
          interviewName={interview.name}
          interviewerName={interviewerName}
          interviewerImage={interviewerImg}
          candidateName={name || "You"}
          isMuted={isMuted}
          activeTurn={activeTurn}
          lastInterviewerResponse={lastInterviewerResponse}
          lastUserResponse={lastUserResponse}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          isPracticing={isPracticing}
          practiceTimeLeft={practiceTimeLeft}
        />
      </>
    );
  }

  // Pre-call lobby
  return (
    <PreCallLobby
      interviewName={interview.name}
      interviewerName={interviewerName}
      interviewerImage={interviewerImg}
      candidateName={name}
      candidateEmail={email}
      isAnonymous={interview?.is_anonymous || false}
      onJoinCall={handleJoinCall}
      onNameChange={setName}
      onEmailChange={setEmail}
      isConnecting={isConnecting}
      organizationLogo={isCustomLogoUpload(interview.logo_url) ? interview.logo_url : organizationLogo}
    />
  );
}

export default Call;

