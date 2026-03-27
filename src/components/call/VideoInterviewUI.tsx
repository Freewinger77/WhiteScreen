"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  Settings,
  ChevronDown,
  Volume2,
  Monitor,
  MessageSquare,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Types
interface VideoInterviewUIProps {
  // Interview data
  interviewName: string;
  interviewerName: string;
  interviewerImage: string;
  candidateName: string;
  
  // Call state
  isConnecting: boolean;
  isCalling: boolean;
  isEnded: boolean;
  isMuted: boolean;
  
  // Transcript
  lastInterviewerResponse: string;
  lastUserResponse: string;
  activeTurn: string;
  transcriptHistory: Array<{ role: string; content: string }>;
  
  // Handlers
  onJoinCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  
  // Optional
  organizationLogo?: string | null;
  themeColor?: string;
}

// Pre-call Lobby Component
const PreCallLobby: React.FC<{
  interviewName: string;
  interviewerName: string;
  interviewerImage: string;
  candidateName: string;
  onJoinCall: () => void;
  isConnecting: boolean;
  organizationLogo?: string | null;
}> = ({
  interviewName,
  interviewerName,
  interviewerImage,
  candidateName,
  onJoinCall,
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
  const [isMicOn, setIsMicOn] = useState(true);

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permissions first
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
              {/* Camera */}
              <div className="relative">
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="appearance-none bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {devices.cameras.map(cam => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || "Camera"}
                    </option>
                  ))}
                </select>
                <VideoIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {/* Microphone */}
              <div className="relative">
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="appearance-none bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {devices.mics.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || "Microphone"}
                    </option>
                  ))}
                </select>
                <MicIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              {/* Speaker */}
              <div className="relative">
                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="appearance-none bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {devices.speakers.map(speaker => (
                    <option key={speaker.deviceId} value={speaker.deviceId}>
                      {speaker.label || "Speaker"}
                    </option>
                  ))}
                </select>
                <Volume2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Join Panel */}
          <div className="w-80 flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-8">
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
              {/* Online indicator */}
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            
            <p className="text-gray-600 mb-8">
              <span className="font-medium text-gray-900">{interviewerName}</span> is in the call
            </p>

            {/* Join Button */}
            <Button
              onClick={onJoinCall}
              disabled={isConnecting}
              className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-lg font-medium text-base shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:shadow-violet-300 disabled:opacity-50"
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

// Active Call Component
const ActiveCall: React.FC<{
  interviewName: string;
  interviewerName: string;
  interviewerImage: string;
  candidateName: string;
  isMuted: boolean;
  activeTurn: string;
  lastInterviewerResponse: string;
  lastUserResponse: string;
  transcriptHistory: Array<{ role: string; content: string }>;
  onEndCall: () => void;
  onToggleMute: () => void;
}> = ({
  interviewName,
  interviewerName,
  interviewerImage,
  candidateName,
  isMuted,
  activeTurn,
  lastInterviewerResponse,
  lastUserResponse,
  transcriptHistory,
  onEndCall,
  onToggleMute,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

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
      {/* Main Video Area */}
      <div className="flex-1 relative">
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
          <span className="text-white/70">•••</span>
        </div>

        {/* AI Interviewer Avatar (Bottom Right) */}
        <div className="absolute bottom-24 right-6">
          <div className={cn(
            "relative w-32 h-32 rounded-2xl overflow-hidden shadow-2xl transition-all",
            activeTurn === "agent" && "ring-4 ring-violet-500"
          )}>
            <Image
              src={interviewerImage}
              alt={interviewerName}
              fill
              className="object-cover"
            />
            {/* Name tag */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                {interviewerName}
              </span>
              <span className="text-white/70 text-xs">•••</span>
            </div>
            {/* Speaking indicator */}
            {activeTurn === "agent" && (
              <div className="absolute inset-0 border-2 border-violet-500 rounded-2xl animate-pulse" />
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
          <div className="flex items-center justify-center gap-4">
            {/* Mute Button */}
            <Button
              onClick={onToggleMute}
              className={cn(
                "w-14 h-14 rounded-full transition-all",
                isMuted 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
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
                "w-14 h-14 rounded-full transition-all",
                !isVideoOn 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
            >
              {isVideoOn ? (
                <VideoIcon className="w-6 h-6 text-white" />
              ) : (
                <VideoOffIcon className="w-6 h-6 text-white" />
              )}
            </Button>

            {/* End Call Button */}
            <Button
              onClick={onEndCall}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 transition-all"
            >
              <PhoneOffIcon className="w-6 h-6 text-white" />
            </Button>

            {/* Transcript Toggle */}
            <Button
              onClick={() => setShowTranscript(!showTranscript)}
              className={cn(
                "w-14 h-14 rounded-full transition-all",
                showTranscript 
                  ? "bg-violet-600 hover:bg-violet-700" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-2 flex items-center justify-between text-white/60 text-sm">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {interviewName}</span>
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
            {/* Current AI Response */}
            {lastInterviewerResponse && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900">{interviewerName}</span>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {lastInterviewerResponse}
                </p>
              </div>
            )}
            
            {/* Current User Response */}
            {lastUserResponse && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-gray-900">{candidateName || "You"}</span>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {lastUserResponse}
                </p>
              </div>
            )}
            
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const VideoInterviewUI: React.FC<VideoInterviewUIProps> = ({
  interviewName,
  interviewerName,
  interviewerImage,
  candidateName,
  isConnecting,
  isCalling,
  isEnded,
  isMuted,
  lastInterviewerResponse,
  lastUserResponse,
  activeTurn,
  transcriptHistory,
  onJoinCall,
  onEndCall,
  onToggleMute,
  organizationLogo,
  themeColor,
}) => {
  // Pre-call state
  const [hasJoined, setHasJoined] = useState(false);

  const handleJoinCall = () => {
    setHasJoined(true);
    onJoinCall();
  };

  // Show pre-call lobby if not joined
  if (!hasJoined && !isCalling) {
    return (
      <PreCallLobby
        interviewName={interviewName}
        interviewerName={interviewerName}
        interviewerImage={interviewerImage}
        candidateName={candidateName}
        onJoinCall={handleJoinCall}
        isConnecting={isConnecting}
        organizationLogo={organizationLogo}
      />
    );
  }

  // Show active call
  if (isCalling || isConnecting) {
    return (
      <ActiveCall
        interviewName={interviewName}
        interviewerName={interviewerName}
        interviewerImage={interviewerImage}
        candidateName={candidateName}
        isMuted={isMuted}
        activeTurn={activeTurn}
        lastInterviewerResponse={lastInterviewerResponse}
        lastUserResponse={lastUserResponse}
        transcriptHistory={transcriptHistory}
        onEndCall={onEndCall}
        onToggleMute={onToggleMute}
      />
    );
  }

  return null;
};

export default VideoInterviewUI;

