"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  ChevronDown,
  FileUp,
  Loader2,
  X,
  CheckCircle,
  Wifi,
  Clock,
  ArrowRight,
  Camera,
  Volume2,
  Monitor,
  Eye,
  Shield,
  Check,
  Sparkles,
  Info,
  Settings,
  FileQuestion,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Interview } from "@/types/interview";
import { toast } from "sonner";
import { Room, RoomEvent, Track } from 'livekit-client';
import axios from "axios";
import { ResponseService } from "@/services/responses.service";
import { FeedbackService } from "@/services/feedback.service";
import { useResponses } from "@/contexts/responses.context";
import { FeedbackData } from "@/types/response";
import { Textarea } from "@/components/ui/textarea";
import { 
  useTabSwitchPrevention,
  TabSwitchWarning 
} from "./tabSwitchPrevention";
import { createClient } from "@supabase/supabase-js";
import lottie from "lottie-web";

// LiveKit room instance
let livekitRoom: Room | null = null;

// Transcript message type
interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Call state type - flow: welcome → details → precall → connecting → connected → ended
type CallState = "welcome" | "details" | "provisioning" | "precall" | "connecting" | "connected" | "ended";

// Progress bar component - 2 segments, centered in left half of screen
const ProgressBar = ({ step }: { step: 1 | 2 }) => (
  <div className="absolute bottom-8 left-0 w-1/2 z-20 pointer-events-none flex justify-center">
    <div className={`steps step-${step}`}>
      <div className="step-segment">
        <div className="fill" />
      </div>
      <div className="step-segment">
        <div className="fill" />
      </div>
    </div>
  </div>
);

interface VideoInterviewExperienceProps {
  interview: Interview;
  interviewerName?: string;
  interviewerAvatar?: string;
  organizationLogo?: string;
}

export default function VideoInterviewExperience({ 
  interview, 
  interviewerName = "James",
  interviewerAvatar = "/interviewers/Alex.png",
  organizationLogo,
}: VideoInterviewExperienceProps) {
  const { createResponse } = useResponses();
  
  // Call state - starts from welcome screen
  const [callState, setCallState] = useState<CallState>("welcome");
  const [callId, setCallId] = useState<string>("");
  const callIdRef = useRef<string>(""); // Ref to ensure call-end handler has latest callId
  
  // Privacy agreement
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  
  // Additional profile info
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  
  // Provisioning state
  const [provisioningStep, setProvisioningStep] = useState(0);
  const [provisioningAnimReady, setProvisioningAnimReady] = useState(false);
  const provisioningLottieRef = useRef<HTMLDivElement>(null);
  const provisioningAnimRef = useRef<any>(null);
  
  // Media state
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState<"strong" | "medium" | "weak">("strong");
  const [mediaPermissionStatus, setMediaPermissionStatus] = useState<"pending" | "granted" | "denied" | "error">("pending");
  
  // Device selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [showDeviceDropdown, setShowDeviceDropdown] = useState<"video" | "audio" | null>(null);
  
  // User info
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  
  // CV Upload
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvParsedText, setCvParsedText] = useState<string>("");
  const [cvStorageUrl, setCvStorageUrl] = useState<string>("");
  const [isParsingCv, setIsParsingCv] = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  
  // Transcript
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const transcriptMessagesRef = useRef<TranscriptMessage[]>([]); // Track current transcript for event handlers
  
  // Speaking indicators
  const [isSpeaking, setIsSpeaking] = useState<"user" | "assistant" | null>(null);
  const [assistantText, setAssistantText] = useState<string>("");
  
  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRefConnected = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoStreamRef = useRef<MediaStream | null>(null);
  
  // Audio recording refs (for conversation audio: user + agent)
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const agentAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mixedAudioStreamRef = useRef<MediaStream | null>(null);
  
  // Tab switch tracking
  const { tabSwitchCount, tabSwitchEvents } = useTabSwitchPrevention({
    isTracking: callState === "connected"
  });
  const tabSwitchCountRef = useRef(tabSwitchCount);
  const tabSwitchEventsRef = useRef(tabSwitchEvents);
  
  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
    tabSwitchEventsRef.current = tabSwitchEvents;
  }, [tabSwitchCount, tabSwitchEvents]);
  
  // Keep transcript ref in sync with state
  useEffect(() => {
    transcriptMessagesRef.current = transcriptMessages;
  }, [transcriptMessages]);

  // Auto-scroll transcript when new messages appear
  const lastMessageCountRef = useRef(0);
  
  useEffect(() => {
    if (!transcriptRef.current || !showTranscript) return;
    
    const container = transcriptRef.current;
    const messageCount = transcriptMessages.length;
    const isNewMessage = messageCount > lastMessageCountRef.current;
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (isNewMessage && messageCount > 0) {
        // New complete message added - scroll to show it near the top
        const messages = container.querySelectorAll('[data-message]');
        const lastMessage = messages[messages.length - 1] as HTMLElement;
        
        if (lastMessage) {
          // Scroll so the new message is about 60px from the top
          const targetScrollTop = lastMessage.offsetTop - 60;
          container.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        }
        lastMessageCountRef.current = messageCount;
      } else if (assistantText) {
        // Partial text being typed - keep scrolled to bottom to follow
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  }, [transcriptMessages, assistantText, showTranscript]);
  
  // Time tracking
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const callStartTimeRef = useRef<Date | null>(null); // Track for event handlers
  const [elapsedTime, setElapsedTime] = useState<string>("0:00");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [interviewProgress, setInterviewProgress] = useState<number>(0); // Progress in minutes
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // Handle requesting media permissions - MUST be called from user interaction (click)
  const handleRequestMediaPermissions = () => {
    console.log("[Media] User-initiated permission request...");
    
    // Call getUserMedia DIRECTLY - not through async/await to preserve user gesture
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log("[Media] Got stream:", stream.id, "tracks:", stream.getTracks().length);
        setVideoStream(stream);
        videoStreamRef.current = stream;
        setMediaPermissionStatus("granted");
        toast.success("Camera and microphone connected!");
        
        // Get available devices after permission granted
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(devices => {
        if (devices) {
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          const audioInputs = devices.filter(d => d.kind === "audioinput");
          console.log("[Media] Found devices - video:", videoInputs.length, "audio:", audioInputs.length);
          setVideoDevices(videoInputs);
          setAudioDevices(audioInputs);
          if (videoInputs.length > 0) setSelectedVideoDevice(videoInputs[0].deviceId);
          if (audioInputs.length > 0) setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      })
      .catch(err => {
        console.error("[Media] Permission request failed:", err?.name, err?.message);
        if (err?.name === "NotAllowedError") {
          setMediaPermissionStatus("denied");
          toast.error("Camera access denied. Please check browser settings.");
        } else if (err?.name === "NotFoundError") {
          setMediaPermissionStatus("error");
          toast.error("No camera or microphone found");
        } else {
          setMediaPermissionStatus("error");
          toast.error("Failed to access camera");
        }
      });
  };
  
  // Cleanup on unmount only - NO automatic permission request
  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        console.log("[Media] Cleaning up stream");
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Attach video stream to preview element
  useEffect(() => {
    if (videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Update video stream when device changes
  const switchVideoDevice = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
      });
      
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      setVideoStream(newStream);
      videoStreamRef.current = newStream;
      setSelectedVideoDevice(deviceId);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      if (videoRefConnected.current) {
        videoRefConnected.current.srcObject = newStream;
      }
      
      // Note: LiveKit handles device switching internally
      // No need to call setInputDevicesAsync like with Vapi
    } catch (err) {
      console.error("Failed to switch video device:", err);
    }
  };

  // Update audio stream when device changes
  const switchAudioDevice = async (deviceId: string) => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
        audio: { deviceId: { exact: deviceId } }
      });
      
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      
      setVideoStream(newStream);
      videoStreamRef.current = newStream;
      setSelectedAudioDevice(deviceId);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      if (videoRefConnected.current) {
        videoRefConnected.current.srcObject = newStream;
      }
      
      // Note: LiveKit handles device switching internally
      // No need to call setInputDevicesAsync like with Vapi
    } catch (err) {
      console.error("Failed to switch audio device:", err);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (videoStream) {
      videoStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      
      // Update LiveKit microphone state if connected
      if (callState === "connected" && livekitRoom) {
        livekitRoom.localParticipant.setMicrophoneEnabled(isMuted);
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (videoStream) {
      videoStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  // Start video recording
  const startVideoRecording = () => {
    // Use ref to get latest stream (avoids stale closure)
    const stream = videoStreamRef.current;
    if (!stream) {
      console.error("[VideoRecording] No video stream available");
      return;
    }
    
    try {
      // Check for supported mimeType
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }
      console.log("[VideoRecording] Using mimeType:", mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("[VideoRecording] Chunk recorded, size:", event.data.size);
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error("[VideoRecording] MediaRecorder error:", event);
      };
      
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      console.log("[VideoRecording] Started recording with stream:", stream.id);
    } catch (err) {
      console.error("[VideoRecording] Failed to start:", err);
    }
  };

  // Stop video recording and upload
  const stopVideoRecording = async () => {
    if (!mediaRecorderRef.current) {
      console.error("[VideoRecording] No MediaRecorder to stop");
      return null;
    }
    
    // Check if we have recorded data
    if (recordedChunksRef.current.length === 0) {
      console.error("[VideoRecording] No recorded chunks available");
      return null;
    }
    
    return new Promise<string | null>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        console.log("[VideoRecording] Stopped, chunks:", recordedChunksRef.current.length);
        
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log("[VideoRecording] Blob size:", blob.size);
        recordedChunksRef.current = [];
        
        if (blob.size === 0) {
          console.error("[VideoRecording] Empty blob, no video to upload");
          resolve(null);
          return;
        }
        
        try {
          // Upload to Supabase
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          // Use callIdRef to get latest callId (avoids stale closure)
          const currentCallId = callIdRef.current || `unknown_${Date.now()}`;
          const fileName = `${currentCallId}_${Date.now()}.webm`;
          console.log("[VideoRecording] Uploading to:", fileName);
          
          const { data, error } = await supabase.storage
            .from('videos')
            .upload(fileName, blob, {
              contentType: 'video/webm',
              upsert: false
            });
          
          if (error) {
            console.error("[VideoRecording] Upload error:", error);
            resolve(null);
            return;
          }
          
          const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);
          
          console.log("[VideoRecording] Uploaded successfully:", urlData.publicUrl);
          resolve(urlData.publicUrl);
        } catch (err) {
          console.error("[VideoRecording] Upload failed:", err);
          resolve(null);
        }
      };
      
      mediaRecorder.stop();
    });
  };

  // Start audio recording (conversation: user + agent mixed)
  const startAudioRecording = () => {
    try {
      // We'll start this when agent audio track is available
      console.log("[AudioRecording] Waiting for agent audio track...");
    } catch (err) {
      console.error("[AudioRecording] Failed to start:", err);
    }
  };

  // Mix user mic + agent audio and start recording
  const startMixedAudioRecording = (userAudioTrack: MediaStreamTrack, agentAudioTrack: MediaStreamTrack) => {
    try {
      console.log("[AudioRecording] Mixing user + agent audio");
      
      // Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // Create sources
      const userStream = new MediaStream([userAudioTrack]);
      const agentStream = new MediaStream([agentAudioTrack]);
      
      const userSource = audioContext.createMediaStreamSource(userStream);
      const agentSource = audioContext.createMediaStreamSource(agentStream);
      
      // Create destination to mix both
      const destination = audioContext.createMediaStreamDestination();
      
      // Connect both sources to destination
      userSource.connect(destination);
      agentSource.connect(destination);
      
      // Store mixed stream
      mixedAudioStreamRef.current = destination.stream;
      
      // Start recording the mixed audio
      const mimeType = 'audio/webm';
      const audioRecorder = new MediaRecorder(destination.stream, { mimeType });
      
      audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      audioRecorder.start(1000); // Collect data every second
      audioRecorderRef.current = audioRecorder;
      console.log("[AudioRecording] Started recording mixed audio");
    } catch (err) {
      console.error("[AudioRecording] Failed to mix audio:", err);
    }
  };

  // Stop audio recording and upload
  const stopAudioRecording = async () => {
    if (!audioRecorderRef.current) {
      console.log("[AudioRecording] No audio recorder to stop");
      return null;
    }
    
    if (audioChunksRef.current.length === 0) {
      console.log("[AudioRecording] No audio chunks recorded");
      return null;
    }
    
    return new Promise<string | null>((resolve) => {
      const audioRecorder = audioRecorderRef.current!;
      
      audioRecorder.onstop = async () => {
        console.log("[AudioRecording] Stopped, chunks:", audioChunksRef.current.length);
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("[AudioRecording] Blob size:", blob.size);
        audioChunksRef.current = [];
        
        if (blob.size === 0) {
          console.error("[AudioRecording] Empty blob");
          resolve(null);
          return;
        }
        
        try {
          // Upload to Supabase recordings bucket
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          
          const currentCallId = callIdRef.current || `unknown_${Date.now()}`;
          const fileName = `${currentCallId}.webm`;
          console.log("[AudioRecording] Uploading to:", fileName);
          
          const { data, error } = await supabase.storage
            .from('recordings')
            .upload(fileName, blob, {
              contentType: 'audio/webm',
              upsert: true
            });
          
          if (error) {
            console.error("[AudioRecording] Upload error:", error);
            resolve(null);
            return;
          }
          
          const { data: urlData } = supabase.storage
            .from('recordings')
            .getPublicUrl(fileName);
          
          console.log("[AudioRecording] Uploaded successfully:", urlData.publicUrl);
          
          // Cleanup audio context
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          
          resolve(urlData.publicUrl);
        } catch (err) {
          console.error("[AudioRecording] Upload failed:", err);
          resolve(null);
        }
      };
      
      audioRecorder.stop();
    });
  };

  // CV Upload handler
  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    setCvFile(file);
    setIsParsingCv(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interviewId', interview?.id || '');
      
      const response = await axios.post('/api/upload-candidate-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setCvParsedText(response.data.parsedText || '');
        setCvStorageUrl(response.data.storageUrl || '');
        toast.success("CV uploaded successfully!");
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error("CV upload error:", error);
      toast.error(error?.response?.data?.error || "Failed to upload CV");
      setCvFile(null);
    } finally {
      setIsParsingCv(false);
    }
  };

  // Track last transcript to prevent duplicates
  const lastTranscriptRef = useRef<string>("");
  
  // LiveKit cleanup on unmount
  useEffect(() => {
    return () => {
      if (livekitRoom) {
        livekitRoom.disconnect();
      }
    };
  }, []);

  // Elapsed time counter + progress tracking
  useEffect(() => {
    if (callState !== "connected" || !callStartTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedTime(`${mins}:${secs.toString().padStart(2, '0')}`);
      setElapsedSeconds(elapsed);
      // Progress in minutes for the progress bar
      setInterviewProgress(elapsed / 60);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [callState, callStartTime]);

  // BACKUP: Save response when call ends - this useEffect is reliable because callId is in deps
  const hasSavedRef = useRef(false);
  useEffect(() => {
    // Only save if call has ended AND we have a callId AND not already saved
    if (callState === "ended" && callId && !hasSavedRef.current) {
      console.log("[Backup Save] Call ended, saving response for callId:", callId);
      hasSavedRef.current = true;
      
      const saveEndedResponse = async () => {
        try {
          const currentTabSwitchCount = tabSwitchCountRef.current;
          const currentTabSwitchEvents = tabSwitchEventsRef.current;
          
          const transcriptText = transcriptMessagesRef.current
            .map(msg => `${msg.role === "assistant" ? interviewerName : userName}: ${msg.content}`)
            .join("\n\n");

          const duration = callStartTimeRef.current 
            ? Math.round((Date.now() - callStartTimeRef.current.getTime()) / 1000) 
            : 0;

          await ResponseService.saveResponse({
            is_ended: true,
            duration: duration,
            tab_switch_count: currentTabSwitchCount,
            tab_switch_events: currentTabSwitchEvents.length > 0 ? currentTabSwitchEvents : null,
            interview_id: interview.id,
            email: userEmail,
            name: userName,
            details: {
              transcript: transcriptText,
              livekit_room_name: callId,
            },
          }, callId);
          
          console.log("[Backup Save] Response saved successfully for callId:", callId);
        } catch (error) {
          console.error("[Backup Save] Failed to save response:", error);
        }
      };
      
      saveEndedResponse();
    }
  }, [callState, callId, interview.id, userEmail, userName, interviewerName]);

  // Join call
  const joinCall = async () => {
    if (!userName || !userEmail) {
      toast.error("Please enter your name and email");
      return;
    }
    
    // Don't set state here - provisioning screen handles the transition
    
    try {
      // Get LiveKit token
      const response = await axios.post("/api/livekit-token", {
        candidate_name: userName,
        candidate_email: userEmail,
        interview_id: interview.id,
        interviewer_id: interview.interviewer_id,
        dynamic_data: {
          name: userName,
          mins: interview.time_duration || "10",
          objective: interview.objective || "",
          job_context: interview.job_context || "",
          questions: interview.questions?.map((q, i) => `Question ${i + 1} (follow_up_count: ${q.follow_up_count || 0}): ${q.question}`).join(", ") || "",
        }
      });
      
      const { token, roomName, livekitUrl } = response.data;
      setCallId(roomName);
      callIdRef.current = roomName; // Update ref for event handlers
      
      // Create response record
      const detailsObj: any = {};
      if (cvParsedText) {
        detailsObj.attached_cv = {
          text: cvParsedText,
          url: cvStorageUrl || null,
          fileName: cvFile?.name || null,
        };
      }
      
      // Add profile URLs to details
      if (linkedinUrl) {
        detailsObj.linkedin_url = linkedinUrl;
      }
      if (githubUrl) {
        detailsObj.github_url = githubUrl;
      }
      
      // Determine profile_id and profile_type (prioritize LinkedIn)
      let profileId: string | null = null;
      let profileType: string | null = null;
      if (linkedinUrl) {
        profileId = linkedinUrl;
        profileType = "linkedin";
      } else if (githubUrl) {
        profileId = githubUrl;
        profileType = "github";
      }
      
      await createResponse({
        interview_id: interview.id,
        call_id: roomName,
        email: userEmail,
        name: userName,
        details: Object.keys(detailsObj).length > 0 ? detailsObj : null,
        cv_url: cvStorageUrl || null,
        profile_id: profileId,
        profile_type: profileType,
      });
      
      // Connect to LiveKit room
      const newRoom = new Room();
      livekitRoom = newRoom;
      
      // Set up event handlers BEFORE connecting
      newRoom.on(RoomEvent.Connected, () => {
        console.log("[LiveKit] Connected to room");
        setCallState("connected");
        const now = new Date();
        setCallStartTime(now);
        callStartTimeRef.current = now; // Keep ref in sync for event handlers
        startVideoRecording();
        
        // Re-attach video stream when call starts
        setTimeout(() => {
          if (videoRefConnected.current && videoStream) {
            videoRefConnected.current.srcObject = videoStream;
          }
        }, 100);
        
        // Slide in transcript panel after a short delay
        setTimeout(() => {
          setShowTranscript(true);
        }, 300);
      });
      
      newRoom.on(RoomEvent.Disconnected, async () => {
        console.log("[LiveKit] Disconnected, saving response for callId:", callIdRef.current);
        setCallState("ended");
        setIsSpeaking(null);
        
        const duration = callStartTimeRef.current 
          ? Math.round((Date.now() - callStartTimeRef.current.getTime()) / 1000) 
          : 0;
        
        const transcriptText = transcriptMessagesRef.current
          .map(msg => `${msg.role === "assistant" ? interviewerName : userName}: ${msg.content}`)
          .join("\n\n");
        
        // Save core data FIRST — transcript, duration, metadata — before attempting recordings
        if (callIdRef.current) {
          try {
            await ResponseService.saveResponse({
              is_ended: true,
              duration: duration,
              tab_switch_count: tabSwitchCountRef.current,
              tab_switch_events: tabSwitchEventsRef.current.length > 0 ? tabSwitchEventsRef.current : null,
              details: {
                transcript: transcriptText,
                livekit_room_name: callIdRef.current,
              },
            }, callIdRef.current);
            console.log("[LiveKit] Core response saved successfully");
          } catch (err) {
            console.error("[LiveKit] Failed to save core response:", err);
          }
        }

        // Now attempt recordings — failures here won't lose transcript/duration
        let videoUrl: string | null = null;
        let audioUrl: string | null = null;
        
        try {
          videoUrl = await stopVideoRecording();
        } catch (err) {
          console.error("[LiveKit] Failed to stop video recording:", err);
        }
        
        try {
          audioUrl = await stopAudioRecording();
        } catch (err) {
          console.error("[LiveKit] Failed to stop audio recording:", err);
        }

        // Update response with recording URLs if we got them
        if (callIdRef.current && (videoUrl || audioUrl)) {
          try {
            await ResponseService.saveResponse({
              ...(videoUrl ? { video_url: videoUrl } : {}),
              details: {
                transcript: transcriptText,
                livekit_room_name: callIdRef.current,
                ...(audioUrl ? { recording_url: audioUrl } : {}),
              },
            }, callIdRef.current);
            console.log("[LiveKit] Recording URLs saved successfully");
          } catch (err) {
            console.error("[LiveKit] Failed to save recording URLs:", err);
          }
        }
      });
      
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log("[LiveKit] Agent audio track subscribed");
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
          audioElement.play();
          
          // Store agent audio track for mixing
          agentAudioTrackRef.current = track.mediaStreamTrack;
          
          // Start mixed audio recording if we have both user and agent audio
          if (videoStream) {
            const userAudioTrack = videoStream.getAudioTracks()[0];
            if (userAudioTrack && agentAudioTrackRef.current) {
              console.log("[AudioRecording] Starting mixed recording (user + agent)");
              startMixedAudioRecording(userAudioTrack, agentAudioTrackRef.current);
            }
          }
        }
      });
      
      // Listen for transcription segments from LiveKit's built-in transcription
      newRoom.on(RoomEvent.TranscriptionReceived, (segments, participant, publication) => {
        try {
          console.log("[LiveKit] Transcription received:", segments, "from:", participant?.identity);
          
          segments.forEach(segment => {
            const isFinal = segment.final;
            const text = segment.text;
            
            if (!text) return;
            
            // Determine if this is from the agent or user
            const isAgent = participant?.identity === 'agent' || participant?.identity?.includes('agent');
            const role = isAgent ? "assistant" : "user";
            
            if (isFinal) {
              const messageKey = `${role}-${text}`;
              if (messageKey !== lastTranscriptRef.current) {
                const newMessage: TranscriptMessage = {
                  id: Date.now().toString(),
                  role: role,
                  content: text,
                  timestamp: new Date()
                };
                setTranscriptMessages(prev => [...prev, newMessage]);
                lastTranscriptRef.current = messageKey;
                console.log("[LiveKit] Added final transcript:", role, text.substring(0, 50));
              }
              if (role === "assistant") {
                setAssistantText("");
                setIsSpeaking(null);
              } else {
                setIsSpeaking(null);
              }
            } else {
              // Partial transcript
              if (role === "assistant") {
                setAssistantText(text);
                setIsSpeaking("assistant");
              } else {
                setIsSpeaking("user");
              }
            }
          });
        } catch (error) {
          console.error("[LiveKit] Error handling transcription:", error);
        }
      });
      
      // Connect to room
      await newRoom.connect(livekitUrl, token);
      console.log("[LiveKit] Connecting to room...");
      
      // Enable microphone only (not camera - local preview only)
      await newRoom.localParticipant.setMicrophoneEnabled(true);
      console.log("[LiveKit] Microphone enabled");
      
    } catch (error: any) {
      console.error("Failed to start call:", error);
      toast.error(error?.response?.data?.error || "Failed to start interview");
      setCallState("details");
    }
  };

  // End call
  const endCall = () => {
    if (livekitRoom) {
      livekitRoom.disconnect();
    }
  };

  // Shared left panel with interview info - used in Steps 1 and 2
  const InterviewInfoPanel = () => (
    <div className="flex-1 flex flex-col justify-center items-center p-12 py-16">
      <div className="max-w-md text-center">
        {/* Organization logo - only show if provided */}
        {organizationLogo && (
          <img src={organizationLogo} alt="Organization" className="h-14 mb-10 mx-auto" />
        )}
        
        {/* Interview Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {interview.name}
        </h1>
        
        {/* Interview Description */}
        {interview.objective && (
          <p className="text-lg text-gray-600 mb-10 leading-relaxed">
            {interview.objective}
          </p>
        )}
        
        {/* Your interview will be with */}
        <p className="text-gray-500 mb-4">Your interview will be with</p>
        
        {/* AI Interviewer Preview - Subtle glowing gradient border */}
        <div className="gradient-border-glow bg-white/80 backdrop-blur-xl rounded-2xl p-5 inline-flex items-center gap-4 shadow-xl border border-white/60">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-violet-200">
            <img 
              src={interviewerAvatar} 
              alt={interviewerName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-lg">{interviewerName}</p>
            <p className="text-gray-500 text-sm">Your AI Interview Assistant</p>
          </div>
        </div>
      </div>
    </div>
  );

  // STEP 1: Welcome screen - Interview info + Instructions
  const renderWelcome = () => (
    <div className="flex h-full w-full bg-gradient-to-br from-indigo-50 via-white to-violet-50 relative">
      {/* Left Side - Interview Info */}
      <InterviewInfoPanel />
      
      {/* Center Faded Divider - exactly centered */}
      <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 flex items-center">
        <div className="divider-faded-vertical h-1/2" />
      </div>
      
      {/* Right Side - Instructions with slide animation */}
      <div className="flex-1 flex flex-col justify-center items-center p-12 py-16 bg-white/30 backdrop-blur-sm animate-slide-in-right">
        <div className="max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center justify-center gap-3">
            <Info className="text-violet-500" />
            Before You Begin
          </h2>
          
          {/* Instructions Grid - Glass effect */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-violet-100/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Monitor size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Close Other Tabs</h3>
                <p className="text-sm text-gray-600">Please close all windows and tabs except this interview</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-violet-100/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Eye size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Maintain Eye Contact</h3>
                <p className="text-sm text-gray-600">Try to maintain eye contact with the screen at all times</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-violet-100/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Camera size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Camera & Microphone</h3>
                <p className="text-sm text-gray-600">Ensure they work properly in a quiet environment</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-lg">
              <div className="w-10 h-10 rounded-full bg-violet-100/80 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-violet-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Duration</h3>
                <p className="text-sm text-gray-600">This interview takes approximately {interview.time_duration || 10} minutes</p>
              </div>
            </div>
          </div>
          
          {/* Monitoring Notice - Glass effect */}
          <div className="p-4 bg-amber-50/70 backdrop-blur-sm rounded-xl border border-amber-200/50 shadow-lg">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                All activity including screen content is monitored only for interview purposes and is destroyed upon role closure.
              </p>
            </div>
          </div>
        </div>
        
        {/* Privacy Agreement Checkbox - Outside the card */}
        <label className="flex items-start gap-3 cursor-pointer mt-6 max-w-md">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={privacyAgreed}
              onChange={(e) => setPrivacyAgreed(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              privacyAgreed 
                ? "bg-violet-600 border-violet-600" 
                : "bg-white border-gray-300"
            }`}>
              {privacyAgreed && <Check size={14} className="text-white" />}
            </div>
          </div>
          <span className="text-sm text-gray-600">
            By continuing, I agree to my data being processed in accordance with local laws and the{" "}
            <a 
              href="https://privacy.tryrapidscreen.com" 
              className="text-violet-600 hover:text-violet-700 underline"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>
          </span>
        </label>
        
        {/* Continue Button */}
        <Button
          onClick={() => setCallState("details")}
          disabled={!privacyAgreed}
          className="w-full max-w-md py-6 text-lg font-medium bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-xl shadow-lg shadow-violet-200 group disabled:opacity-50 disabled:cursor-not-allowed mt-6"
        >
          Continue
          <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
      
      {/* Progress Bar */}
      <ProgressBar step={1} />
    </div>
  );

  // STEP 2: Details screen - Interview info (left) + Form (right slides in)
  const renderDetails = () => (
    <div className="flex h-full w-full bg-gradient-to-br from-indigo-50 via-white to-violet-50 relative">
      {/* Left Side - Same Interview Info */}
      <InterviewInfoPanel />
      
      {/* Center Faded Divider - exactly centered */}
      <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 flex items-center">
        <div className="divider-faded-vertical h-1/2" />
      </div>
      
      {/* Right side - Form panel with slide-in animation */}
      <div className="flex-1 flex flex-col justify-center items-center p-12 py-16 bg-white/30 backdrop-blur-sm overflow-y-auto animate-slide-in-right">
        <div className="max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Complete Your Profile</h1>
          <p className="text-gray-500 mb-6 text-center">Fill in your details to continue</p>
        
          {/* Required Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-lg"
              />
            </div>
          </div>
        
          {/* CV Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Resume/CV</label>
            <input
              type="file"
              ref={cvInputRef}
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleCvUpload}
            />
            
            {!cvFile ? (
              <button
                onClick={() => cvInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-colors bg-white/50 backdrop-blur-sm"
              >
                <FileUp size={18} />
                <span>Upload CV (optional)</span>
              </button>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 bg-green-50/70 backdrop-blur-sm border border-green-200 rounded-xl shadow-lg">
                <div className="flex items-center gap-2">
                  {isParsingCv ? (
                    <Loader2 size={16} className="text-violet-500 animate-spin" />
                  ) : (
                    <CheckCircle size={16} className="text-green-500" />
                  )}
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">
                    {cvFile.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCvFile(null);
                    setCvParsedText("");
                    setCvStorageUrl("");
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        
          {/* Optional Profile Links */}
          <div className="space-y-4 mb-8">
            <p className="text-sm font-medium text-gray-700">Optional Profile Links</p>
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <img 
                  src="/icons/linkedin.png" 
                  alt="LinkedIn" 
                  className="w-5 h-5"
                />
              </div>
              <input
                type="url"
                placeholder="LinkedIn profile URL"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
              />
            </div>
            
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <img 
                  src="/icons/github.png" 
                  alt="GitHub" 
                  className="w-5 h-5"
                />
              </div>
              <input
                type="url"
                placeholder="GitHub profile URL"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>
        
          {/* Continue Button */}
          <Button
            onClick={goToPrecall}
            disabled={!userName || !userEmail || isParsingCv}
            className="w-full py-6 text-lg font-medium bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-xl shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <ProgressBar step={2} />
    </div>
  );

  // Go to precall - request camera permissions then go directly to precall screen
  const goToPrecall = () => {
    // Request camera permissions BEFORE going to precall
    console.log("[Media] Requesting permissions on Next click...");
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log("[Media] Permissions granted!");
        setVideoStream(stream);
        videoStreamRef.current = stream;
        setMediaPermissionStatus("granted");
        
        // Get available devices
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(devices => {
        if (devices) {
          const videoInputs = devices.filter(d => d.kind === "videoinput");
          const audioInputs = devices.filter(d => d.kind === "audioinput");
          setVideoDevices(videoInputs);
          setAudioDevices(audioInputs);
          if (videoInputs.length > 0) setSelectedVideoDevice(videoInputs[0].deviceId);
          if (audioInputs.length > 0) setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        // Go directly to precall screen
        setCallState("precall");
      })
      .catch(err => {
        console.error("[Media] Permission request failed:", err?.name);
        setMediaPermissionStatus("denied");
        // Still go to precall - user can retry there
        setCallState("precall");
      });
  };

  // Start actual call from precall screen
  const startInterview = () => {
    // Show connecting state immediately - fade happens in parallel with connection
    setCallState("connecting");
    setConnectingFadeProgress(0);
    
    // Start call in background - don't await, let event handlers manage state
    joinCall().catch(error => {
      console.error("Error starting interview:", error);
      setCallState("precall");
      toast.error("Failed to connect. Please try again.");
    });
  };

  // Provisioning animation effect
  useEffect(() => {
    if (callState === "provisioning") {
      // Reset animation ready state
      setProvisioningAnimReady(false);
      
      // Initialize Lottie animation
      if (provisioningLottieRef.current && !provisioningAnimRef.current) {
        provisioningAnimRef.current = lottie.loadAnimation({
          container: provisioningLottieRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/35984/LEGO_loader_chrisgannon.json'
        });
        provisioningAnimRef.current.setSpeed(3.24);
        
        // Wait for animation to be ready
        provisioningAnimRef.current.addEventListener('data_ready', () => {
          setProvisioningAnimReady(true);
        });
      }
      
      // Progress through steps
      const steps = [
        { delay: 1500, step: 1 }, // Provisioning interview...
        { delay: 2500, step: 2 }, // Setting up questions...
        { delay: 3500, step: 3 }, // Preparing meeting room...
      ];
      
      const timers: NodeJS.Timeout[] = [];
      
      steps.forEach(({ delay, step }) => {
        timers.push(setTimeout(() => setProvisioningStep(step), delay));
      });
      
      // Go to precall screen after provisioning animation
      timers.push(setTimeout(() => {
        if (provisioningAnimRef.current) {
          provisioningAnimRef.current.destroy();
          provisioningAnimRef.current = null;
        }
        setCallState("precall");
      }, 4500));
      
      return () => {
        timers.forEach(clearTimeout);
        if (provisioningAnimRef.current) {
          provisioningAnimRef.current.destroy();
          provisioningAnimRef.current = null;
        }
      };
    }
  }, [callState]);

  // Render provisioning state with animated steps
  const renderProvisioning = () => {
    const steps = [
      { text: "Provisioning interview...", icon: <Settings className="animate-spin" size={20} /> },
      { text: "Setting up questions...", icon: <FileQuestion size={20} /> },
      { text: "Preparing meeting room...", icon: <Users size={20} /> },
    ];
    
    return (
      <div className="flex h-full w-full bg-gradient-to-br from-indigo-50 via-white to-violet-50 items-center justify-center">
        <div className={`text-center max-w-md transition-opacity duration-300 ${provisioningAnimReady ? 'opacity-100' : 'opacity-0'}`}>
          {/* Lottie animation */}
          <div ref={provisioningLottieRef} className="w-48 h-48 mx-auto mb-6" />
          
          {/* Progress steps - fixed width cards with aligned icons */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-500 w-72 mx-auto ${
                  provisioningStep >= index 
                    ? "bg-white shadow-lg border border-gray-100 opacity-100 transform translate-y-0" 
                    : "opacity-0 transform translate-y-4"
                }`}
              >
                <div className={`w-6 flex-shrink-0 flex items-center justify-center ${provisioningStep === index ? "text-violet-500" : provisioningStep > index ? "text-green-500" : "text-gray-400"}`}>
                  {provisioningStep > index ? <CheckCircle size={20} /> : step.icon}
                </div>
                <span className={`font-medium text-left ${provisioningStep >= index ? "text-gray-900" : "text-gray-400"}`}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>
          
          <p className="text-gray-500 mt-8 animate-pulse">
            Please wait while we set everything up...
          </p>
      </div>
    </div>
  );
  };

  // Connecting state - 2 second fade from white to dark with LEGO blocks
  const [connectingFadeProgress, setConnectingFadeProgress] = useState(0);
  const connectingLottieRef = useRef<HTMLDivElement>(null);
  const connectingAnimRef = useRef<any>(null);
  
  // Fade animation effect + LEGO blocks loader
  useEffect(() => {
    if (callState === "connecting") {
      // 2 second fade
      const startTime = Date.now();
      const duration = 2000;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        setConnectingFadeProgress(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
      
      // Initialize LEGO blocks animation
      if (connectingLottieRef.current && !connectingAnimRef.current) {
        connectingAnimRef.current = lottie.loadAnimation({
          container: connectingLottieRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/35984/LEGO_loader_chrisgannon.json'
        });
        connectingAnimRef.current.setSpeed(3.24);
      }
      
      return () => {
        if (connectingAnimRef.current) {
          connectingAnimRef.current.destroy();
          connectingAnimRef.current = null;
        }
      };
    }
  }, [callState]);
  
  // Render connecting state - 2s fade from white to dark with LEGO blocks (no text)
  const renderConnecting = () => (
    <div 
      className="flex h-full w-full items-center justify-center transition-colors duration-500"
      style={{ 
        backgroundColor: `rgb(${Math.round(255 - connectingFadeProgress * 240)}, ${Math.round(255 - connectingFadeProgress * 249)}, ${Math.round(255 - connectingFadeProgress * 246)})` 
      }}
    >
      <div style={{ opacity: connectingFadeProgress }}>
        {/* LEGO blocks animation - no text */}
        <div ref={connectingLottieRef} className="w-48 h-48" />
      </div>
    </div>
  );

  // Attach video stream to connected video element (simple like old code)
  useEffect(() => {
    if (callState === "connected" && videoRefConnected.current && videoStream) {
      videoRefConnected.current.srcObject = videoStream;
    }
  }, [callState, videoStream]);

  // Attach video stream to precall video element
  useEffect(() => {
    if (callState === "precall" && videoRef.current && videoStream) {
      console.log("[Media] Attaching stream to precall video element");
      videoRef.current.srcObject = videoStream;
      
      // Ensure video plays
      videoRef.current.play().catch(err => {
        console.warn("[Media] Video autoplay failed:", err);
      });
    }
  }, [callState, videoStream]);
  
  // Also try to attach when video element is ready
  useEffect(() => {
    if (callState === "precall" && videoStream) {
      const attachVideo = () => {
        if (videoRef.current && !videoRef.current.srcObject) {
          console.log("[Media] Late attaching stream to precall video");
          videoRef.current.srcObject = videoStream;
          videoRef.current.play().catch(() => {});
        }
      };
      // Try multiple times in case element isn't ready
      attachVideo();
      const t1 = setTimeout(attachVideo, 100);
      const t2 = setTimeout(attachVideo, 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [callState, videoStream]);

  // STEP 3: Precall screen - Camera/mic setup + Start interview (70/30 split)
  const renderPrecall = () => (
    <div className="flex h-full w-full bg-white relative">
      {/* Left side - Video preview (70%) */}
      <div className="w-[70%] flex flex-col items-center justify-center p-12 py-16 animate-fade-in-smooth bg-white">
        {/* Organization logo */}
        {organizationLogo && (
          <div className="absolute top-6 left-6 flex items-center gap-2 z-20">
            <img src={organizationLogo} alt="Logo" className="h-8" />
          </div>
        )}
        
        {/* Video Preview Card */}
        <div className="relative w-full max-w-3xl aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
          {/* Connection indicator */}
          <div className="absolute top-4 left-4 z-10">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md ${
              connectionQuality === "strong" 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : connectionQuality === "medium"
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              <Wifi size={12} />
              {connectionQuality === "strong" ? "Strong Connection" : connectionQuality === "medium" ? "Good Connection" : "Weak Connection"}
            </div>
          </div>
          
          {/* Video element */}
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${!isVideoOn || !videoStream ? 'hidden' : ''}`}
          />
          
          {/* No camera stream - request permission */}
          {!videoStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800 text-white">
              <Camera size={48} className="mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Camera not connected</p>
              <p className="text-sm text-gray-400 mb-4 text-center px-4">
                {mediaPermissionStatus === "denied" 
                  ? "Permission denied. Please enable camera in browser settings and refresh."
                  : "Click below to enable your camera and microphone"}
              </p>
              <button
                onClick={handleRequestMediaPermissions}
                className="px-6 py-3 bg-violet-500 hover:bg-violet-600 rounded-xl text-white font-medium transition-colors"
              >
                {mediaPermissionStatus === "denied" ? "Try Again" : "Enable Camera"}
              </button>
            </div>
          )}
          
          {/* Video off placeholder */}
          {videoStream && !isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-3xl font-semibold text-white">
                  {userName ? userName[0]?.toUpperCase() : "?"}
                </span>
              </div>
            </div>
          )}
          
          {/* User name badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <span className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm px-3 py-1 rounded-lg">
              {userName || "You"}
            </span>
            {isMuted && <MicOff size={14} className="text-red-400" />}
          </div>
        </div>
        
        {/* Device Selection */}
        <div className="flex items-center gap-4 mt-6">
          {/* Camera selector */}
          <div className="relative">
            <button 
              onClick={() => setShowDeviceDropdown(showDeviceDropdown === "video" ? null : "video")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-sm hover:bg-white rounded-xl text-gray-700 text-sm transition-all shadow-lg border border-white/60"
            >
              <Video size={16} className="text-violet-500" />
              <span className="max-w-[120px] truncate">
                {videoDevices.find(d => d.deviceId === selectedVideoDevice)?.label || "Camera"}
              </span>
              <ChevronDown size={14} />
            </button>
            {showDeviceDropdown === "video" && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl py-2 z-20 border border-white/60">
                {videoDevices.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => {
                      switchVideoDevice(device.deviceId);
                      setShowDeviceDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-violet-50 ${
                      selectedVideoDevice === device.deviceId ? "text-violet-600 font-medium" : "text-gray-700"
                    }`}
                  >
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Mic selector */}
          <div className="relative">
            <button 
              onClick={() => setShowDeviceDropdown(showDeviceDropdown === "audio" ? null : "audio")}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-sm hover:bg-white rounded-xl text-gray-700 text-sm transition-all shadow-lg border border-white/60"
            >
              <Mic size={16} className="text-violet-500" />
              <span className="max-w-[120px] truncate">
                {audioDevices.find(d => d.deviceId === selectedAudioDevice)?.label || "Microphone"}
              </span>
              <ChevronDown size={14} />
            </button>
            {showDeviceDropdown === "audio" && (
              <div className="absolute bottom-full mb-2 left-0 w-64 bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl py-2 z-20 border border-white/60">
                {audioDevices.map(device => (
                  <button
                    key={device.deviceId}
                    onClick={() => {
                      switchAudioDevice(device.deviceId);
                      setShowDeviceDropdown(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-violet-50 ${
                      selectedAudioDevice === device.deviceId ? "text-violet-600 font-medium" : "text-gray-700"
                    }`}
                  >
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Toggle buttons */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-xl transition-all shadow-lg ${
              isMuted 
                ? "bg-red-500 text-white" 
                : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white border border-white/60"
            }`}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} className="text-violet-500" />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-xl transition-all shadow-lg ${
              !isVideoOn 
                ? "bg-red-500 text-white" 
                : "bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white border border-white/60"
            }`}
          >
            {isVideoOn ? <Video size={18} className="text-violet-500" /> : <VideoOff size={18} />}
          </button>
        </div>
      </div>
      
      {/* Faded Divider at 70% mark - exactly centered */}
      <div className="absolute left-[70%] -translate-x-1/2 inset-y-0 flex items-center">
        <div className="divider-faded-vertical h-1/2" />
      </div>
      
      {/* Right side - White panel (30%) with centered content, fades in */}
      <div className="w-[30%] flex items-center justify-center p-8 bg-white animate-fade-in-smooth">
        <div className="flex flex-col items-center text-center">
          {/* Ready to join heading */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-10">Ready to join?</h1>
          
          {/* James Avatar with purple gradient ring */}
          <div className="relative mb-5">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-violet-500 to-indigo-500">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
          <img 
            src={interviewerAvatar} 
            alt={interviewerName}
                  className="w-full h-full object-cover"
          />
        </div>
        </div>
        </div>
          
          {/* James is in the call */}
          <p className="text-base mb-12">
            <span className="text-violet-600 font-medium">{interviewerName}</span>
            <span className="text-gray-500"> is in the call</span>
          </p>
        
        {/* Join button */}
        <Button
            onClick={startInterview}
            className="px-10 py-4 text-base font-medium bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-full shadow-lg shadow-violet-200"
        >
            Join Interview
        </Button>
      </div>
      </div>
    </div>
  );

  // Render connected state (in-call)
  const renderConnected = () => (
    <div className="flex h-screen max-h-screen w-full bg-slate-900 overflow-hidden relative">
      {/* Main video area - adjusts width based on transcript */}
      <div className={`flex flex-col min-h-0 transition-all duration-500 ease-in-out ${
        showTranscript ? "w-[70%]" : "w-full"
      }`}>
        {/* Video container - takes remaining space */}
        <div className="flex-1 relative p-3 min-h-0">
          {/* Candidate video (large) - white border when speaking */}
          <div className={`relative w-full h-full bg-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
            isSpeaking === "user" ? "ring-4 ring-white shadow-lg shadow-white/20" : ""
          }`}>
            <video 
              ref={videoRefConnected}
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!isVideoOn || !videoStream ? 'hidden' : ''}`}
            />
            
            {!isVideoOn && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-4xl font-semibold text-white">
                    {userName ? userName[0]?.toUpperCase() : "?"}
                  </span>
                </div>
              </div>
            )}
            
            {/* Name badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 px-2.5 py-1 rounded-lg">
              <span className="text-white text-sm font-medium">{userName}</span>
              {isSpeaking === "user" && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-2.5 bg-white rounded-full animate-pulse" />
                  <span className="w-1 h-2.5 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1 h-2.5 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                </span>
              )}
            </div>
          </div>
          
          {/* AI Interviewer (small overlay) - white border when speaking */}
          <div className={`absolute bottom-6 right-6 w-36 bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
            isSpeaking === "assistant" ? "ring-4 ring-white shadow-lg shadow-white/30" : ""
          }`}>
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center p-4">
              <img 
                src={interviewerAvatar} 
                alt={interviewerName}
                className="w-16 h-16 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="px-2 py-1.5 bg-white flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800">{interviewerName}</span>
              {isSpeaking === "assistant" && (
                <span className="flex gap-0.5">
                  <span className="w-1 h-1.5 bg-violet-500 rounded-full animate-pulse" />
                  <span className="w-1 h-1.5 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1 h-1.5 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom control bar - fixed height with progress bar */}
        <div className="flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
          {/* Interview progress bar */}
          <div className="h-1 w-full bg-slate-700 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000 ease-linear"
              style={{ 
                width: `${Math.min(100, (interviewProgress / (Number(interview.time_duration) || 10)) * 100)}%` 
              }}
            />
          </div>
          
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-white text-xs">
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-gray-500">|</span>
              <span className="truncate max-w-[150px]">{interview.name}</span>
              <span className="text-gray-500">({elapsedTime} / {interview.time_duration || 10}min)</span>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Mic button with dropdown */}
              <div className="relative flex items-center">
                <button
                  onClick={toggleMute}
                  className={`p-2.5 rounded-l-full transition-colors ${
                    isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  onClick={() => setShowDeviceDropdown(showDeviceDropdown === "audio" ? null : "audio")}
                  className={`p-2.5 rounded-r-full border-l border-white/20 transition-colors ${
                    isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <ChevronDown size={14} className={`transition-transform ${showDeviceDropdown === "audio" ? "rotate-180" : ""}`} />
                </button>
                {/* Audio device dropdown - opens upward */}
                {showDeviceDropdown === "audio" && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-800 rounded-lg shadow-xl py-1 z-50 border border-white/10">
                    <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">Microphone</div>
                    {audioDevices.map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => {
                          switchAudioDevice(device.deviceId);
                          setShowDeviceDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
                          selectedAudioDevice === device.deviceId ? "text-violet-400" : "text-white"
                        }`}
                      >
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Camera button with dropdown */}
              <div className="relative flex items-center ml-1">
                <button
                  onClick={toggleVideo}
                  className={`p-2.5 rounded-l-full transition-colors ${
                    !isVideoOn ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
                <button
                  onClick={() => setShowDeviceDropdown(showDeviceDropdown === "video" ? null : "video")}
                  className={`p-2.5 rounded-r-full border-l border-white/20 transition-colors ${
                    !isVideoOn ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <ChevronDown size={14} className={`transition-transform ${showDeviceDropdown === "video" ? "rotate-180" : ""}`} />
                </button>
                {/* Video device dropdown - opens upward */}
                {showDeviceDropdown === "video" && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-slate-800 rounded-lg shadow-xl py-1 z-50 border border-white/10">
                    <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">Camera</div>
                    {videoDevices.map(device => (
                      <button
                        key={device.deviceId}
                        onClick={() => {
                          switchVideoDevice(device.deviceId);
                          setShowDeviceDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${
                          selectedVideoDevice === device.deviceId ? "text-violet-400" : "text-white"
                        }`}
                      >
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={endCall}
                className="px-4 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors ml-2"
              >
                <PhoneOff size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className={`p-2.5 rounded-full transition-colors ${showTranscript ? "bg-purple-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transcript sidebar - 30% width with slide animation */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-[30%] p-3 transition-all duration-500 ease-in-out"
        style={{ 
          transform: showTranscript ? 'translateX(0)' : 'translateX(100%)',
          opacity: showTranscript ? 1 : 0
        }}
      >
        <div className="bg-white h-full rounded-2xl flex flex-col overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <h3 className="font-bold text-gray-900 text-xl">Live Transcript</h3>
          </div>
          
          <div 
            ref={transcriptRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth min-h-0"
          >
            {transcriptMessages.map((message, index) => (
              <div 
                key={message.id} 
                data-message
                className="flex flex-col animate-fade-in-up"
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  animationFillMode: 'backwards'
                }}
              >
                <span className="text-base text-gray-500 mb-2 font-semibold">
                  {message.role === "assistant" ? interviewerName : userName}
                </span>
                <div className={`p-5 rounded-2xl transition-all duration-300 ${
                  message.role === "assistant" 
                    ? "bg-gray-100 text-gray-800 rounded-tl-md" 
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-md"
                }`}>
                  <p className="text-lg leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            
            {/* Partial assistant text with typing animation */}
            {assistantText && (
              <div className="flex flex-col animate-fade-in">
                <span className="text-base text-gray-500 mb-2 font-semibold">{interviewerName}</span>
                <div className="p-5 rounded-2xl bg-gray-100 text-gray-800 rounded-tl-md">
                  <p className="text-lg leading-relaxed">{assistantText}
                    <span className="inline-flex ml-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce ml-1" style={{ animationDelay: '300ms' }} />
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <TabSwitchWarning />
    </div>
  );

  // Handle feedback submission - immediately show thanks
  const handleFeedbackSubmit = async () => {
    if (satisfaction === null && feedbackText.trim() === "") {
      return;
    }
    
    // Immediately show thank you (don't wait for API)
    setFeedbackSubmitted(true);
    setShowFeedback(false);
    
    // Submit in background
    try {
      await FeedbackService.submitFeedback({
        interview_id: interview.id,
        satisfaction: satisfaction ?? 1,
        feedback: feedbackText,
        email: userEmail || null,
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      // Don't show error to user since we already showed thanks
    }
  };

  // Render ended state - Glass effect on white background
  const renderEnded = () => (
    <div className="flex h-full w-full bg-gradient-to-br from-slate-50 to-gray-100 items-center justify-center p-4">
      <div className="relative text-center bg-white/70 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-white/50 shadow-2xl">
        {!showFeedback ? (
          feedbackSubmitted ? (
            <>
              {/* Thank you after feedback */}
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Thank you!</h2>
              <p className="text-gray-600 text-lg">
                Your feedback has been submitted. You can safely close this tab now.
              </p>
            </>
          ) : (
          <>
            {/* Success state */}
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Interview Complete! 🎉</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing the interview with {interviewerName}. 
              We&apos;ll review your responses and be in touch soon!
            </p>
            
              {/* Stats - Glass cards */}
              <div className="flex justify-center gap-4 mb-8">
                <div className="text-center bg-white/50 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/60 shadow-lg">
                  <p className="text-2xl font-bold text-violet-600">{elapsedTime}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              </div>
                <div className="text-center bg-white/50 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/60 shadow-lg">
                  <p className="text-2xl font-bold text-violet-600">{transcriptMessages.filter(m => m.role === "user").length}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Responses</p>
              </div>
            </div>
            
            {/* Feedback button */}
              {interview.show_feedback_form !== false && (
              <Button
                onClick={() => setShowFeedback(true)}
                  className="w-full py-6 text-lg font-medium bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-xl mb-4 shadow-lg shadow-violet-200"
              >
                Rate Your Experience
              </Button>
            )}
            
            <p className="text-sm text-gray-400">
                Or you can safely close this tab
            </p>
          </>
          )
        ) : (
          <>
            {/* Feedback form */}
            <button 
              onClick={() => setShowFeedback(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-700"
            >
              ← Back
            </button>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rate Your Experience</h3>
            <p className="text-gray-500 text-sm mb-6">How was your interview experience?</p>
            
            {/* Satisfaction emojis - Glass buttons */}
            <div className="flex justify-center gap-4 mb-6">
              {[
                { emoji: "😔", label: "Poor", value: 0 },
                { emoji: "😐", label: "Okay", value: 1 },
                { emoji: "😀", label: "Great", value: 2 },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSatisfaction(option.value)}
                  className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 ${
                    satisfaction === option.value 
                      ? "bg-violet-100 ring-2 ring-violet-500 scale-110 shadow-lg" 
                      : "bg-white/50 hover:bg-white/80 border border-gray-100"
                  }`}
                >
                  <span className="text-4xl mb-1">{option.emoji}</span>
                  <span className="text-xs text-gray-600">{option.label}</span>
                </button>
              ))}
            </div>
            
            {/* Feedback text */}
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Any additional feedback? (optional)"
              className="mb-6 min-h-[100px] rounded-xl bg-white/50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-violet-500 focus:border-violet-500"
            />
            
            {/* Submit button */}
            <Button
              onClick={handleFeedbackSubmit}
              disabled={satisfaction === null && feedbackText.trim() === ""}
              className="w-full py-6 text-lg font-medium bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-200"
            >
              Submit Feedback
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden">
      {callState === "welcome" && renderWelcome()}
      {callState === "details" && renderDetails()}
      {callState === "provisioning" && renderProvisioning()}
      {callState === "precall" && renderPrecall()}
      {callState === "connecting" && renderConnecting()}
      {callState === "connected" && renderConnected()}
      {callState === "ended" && renderEnded()}
    </div>
  );
}


