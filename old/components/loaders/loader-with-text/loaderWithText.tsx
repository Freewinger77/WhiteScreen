"use client";

import AnimatedLoader from "../animated-loader/AnimatedLoader";

interface LoaderWithTextProps {
  text?: string;
  fullScreen?: boolean;
}

function LoaderWithText({ text = "Loading...", fullScreen = false }: LoaderWithTextProps) {
  return (
    <div className={`${fullScreen ? 'h-screen' : 'h-full min-h-[200px]'} w-full flex items-center justify-center animate-fadeIn`}>
      <AnimatedLoader size="lg" text={text} />
    </div>
  );
}

export default LoaderWithText;
