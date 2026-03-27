"use client";

import React from "react";
import styles from "./AnimatedLoader.module.css";

interface AnimatedLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

function AnimatedLoader({ size = "md", text, fullScreen = false }: AnimatedLoaderProps) {
  const sizeClasses = {
    sm: "w-8",
    md: "w-14",
    lg: "w-20",
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-fadeIn"
    : "flex items-center justify-center animate-fadeIn";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-4">
        <div className={`${styles.loader} ${sizeClasses[size]} aspect-square`} />
        {text && (
          <p className="text-sm font-medium text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
}

export default AnimatedLoader;

