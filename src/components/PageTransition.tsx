"use client";

import React, { useEffect, useState, useCallback, createContext, useContext } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

interface TransitionContextType {
  navigateWithTransition: (url: string) => void;
  isTransitioning: boolean;
}

const TransitionContext = createContext<TransitionContextType>({
  navigateWithTransition: () => {},
  isTransitioning: false,
});

export const usePageTransition = () => useContext(TransitionContext);

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Navigate with transition
  const navigateWithTransition = useCallback((url: string) => {
    // Start fade out
    setIsTransitioning(true);
    setIsVisible(false);
    setPendingUrl(url);
  }, []);

  // Handle pending navigation after fade out
  useEffect(() => {
    if (pendingUrl && !isVisible) {
      const timer = setTimeout(() => {
        router.push(pendingUrl);
        setPendingUrl(null);
      }, 150); // Wait for fade out to complete
      return () => clearTimeout(timer);
    }
  }, [pendingUrl, isVisible, router]);

  // Reset visibility when route changes
  useEffect(() => {
    setIsVisible(true);
    setIsTransitioning(false);
  }, [pathname, searchParams]);

  return (
    <TransitionContext.Provider value={{ navigateWithTransition, isTransitioning }}>
      <div
        className={`transition-opacity duration-200 ease-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {children}
      </div>
    </TransitionContext.Provider>
  );
}

// Simple wrapper for page content with fade-in animation
export function PageContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`animate-fadeIn ${className}`}>
      {children}
    </div>
  );
}

export default PageTransitionProvider;
