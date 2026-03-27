import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Tab switch event with timestamp
export interface TabSwitchEvent {
  timestamp: number; // Unix timestamp
  duration: number;  // How long the tab was hidden (ms)
}

interface UseTabSwitchPreventionOptions {
  isTracking?: boolean; // Only track when true (during active call)
}

const useTabSwitchPrevention = (options: UseTabSwitchPreventionOptions = {}) => {
  const { isTracking = false } = options;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabSwitchEvents, setTabSwitchEvents] = useState<TabSwitchEvent[]>([]);
  const lastBlurTime = useRef<number>(0);
  const isUserInteracting = useRef<boolean>(false);
  const isTrackingRef = useRef<boolean>(isTracking);

  // Keep ref in sync with prop
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    // Track if user is actively interacting (clicking, typing, etc.)
    const handleUserInteraction = () => {
      isUserInteracting.current = true;
      // Reset after a short delay
      setTimeout(() => {
        isUserInteracting.current = false;
      }, 500);
    };

    // Only count as tab switch if:
    // 1. Document becomes hidden
    // 2. It's not immediately after a user interaction on the page
    // 3. There's a reasonable time gap (not just a quick notification)
    // 4. Tracking is enabled (call is active)
    const handleVisibilityChange = () => {
      // Only track if tracking is enabled
      if (!isTrackingRef.current) return;
      
      if (document.hidden) {
        lastBlurTime.current = Date.now();
      } else {
        // Page became visible again
        const hiddenDuration = Date.now() - lastBlurTime.current;
        
        // Only count if hidden for more than 1 second and user wasn't just interacting
        if (hiddenDuration > 1000 && !isUserInteracting.current && lastBlurTime.current > 0) {
          const switchEvent: TabSwitchEvent = {
            timestamp: lastBlurTime.current,
            duration: hiddenDuration,
          };
          
          setIsDialogOpen(true);
          setTabSwitchCount((prev) => prev + 1);
          setTabSwitchEvents((prev) => [...prev, switchEvent]);
          
          console.log("[TabSwitch] Detected tab switch:", {
            time: new Date(switchEvent.timestamp).toLocaleTimeString(),
            duration: `${Math.round(hiddenDuration / 1000)}s`
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousedown", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousedown", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, []);

  const handleUnderstand = () => {
    setIsDialogOpen(false);
  };

  // Reset function for when a new call starts
  const resetTracking = useCallback(() => {
    setTabSwitchCount(0);
    setTabSwitchEvents([]);
  }, []);

  return { 
    isDialogOpen, 
    tabSwitchCount, 
    tabSwitchEvents,
    handleUnderstand,
    resetTracking,
  };
};

function TabSwitchWarning() {
  const { isDialogOpen, handleUnderstand } = useTabSwitchPrevention();

  return (
    <AlertDialog open={isDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Warning: Tab Switching</AlertDialogTitle>
          <AlertDialogDescription>
            Switching tabs may degrade your interview performance. Tab switching
            is tracked.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-indigo-400 hover:bg-indigo-600 text-white"
            onClick={handleUnderstand}
          >
            I understand
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { TabSwitchWarning, useTabSwitchPrevention };
