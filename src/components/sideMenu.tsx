"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";

function SideMenu() {
  const pathname = usePathname();
  const { navigateWithTransition } = usePageTransition();

  const isInterviewsActive = pathname.endsWith("/dashboard") || pathname.includes("/interviews");
  const isInterviewersActive = pathname.endsWith("/interviewers");
  const isAdminActive = pathname.endsWith("/admin");

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-[20] w-[212px] border-r-[0.5px] border-black/10 bg-white">
      <div className="flex h-full flex-col items-center gap-2 p-4">
        {/* Brand */}
        <div className="w-full">
          <button 
            onClick={() => navigateWithTransition("/dashboard")} 
            className="flex items-center justify-center px-2 py-3 w-full"
          >
            <p className="text-lg tracking-wide">
              <span className="font-extrabold italic text-orange-500">RAPID</span><span className="font-light text-gray-500">SCREEN</span>
            </p>
          </button>
        </div>

        {/* Dashboard Section */}
        <div className="flex w-[180px] flex-col items-start gap-1 pb-3 self-stretch">
          <p className="text-xs font-medium text-gray-400 px-2 pt-2">Dashboard</p>

          {/* Interviews */}
          <button
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              isInterviewsActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => {
              if (!pathname.endsWith("/dashboard")) {
                navigateWithTransition("/dashboard");
              }
            }}
          >
            <Image
              src="/icons/dashboard/interviews.png"
              alt="Interviews"
              width={20}
              height={20}
              className="flex-shrink-0"
            />
            <span>Interviews</span>
          </button>

          {/* Interviewers */}
          <button
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              isInterviewersActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => {
              if (!pathname.endsWith("/interviewers")) {
                navigateWithTransition("/dashboard/interviewers");
              }
            }}
          >
            <Image
              src="/icons/dashboard/interviewers.png"
              alt="Interviewers"
              width={20}
              height={20}
              className="flex-shrink-0"
            />
            <span>Interviewers</span>
          </button>

          {/* Admin */}
          <button
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              isAdminActive
                ? "bg-gray-100 text-gray-900"
                : "text-gray-700 hover:bg-gray-50"
            }`}
            onClick={() => {
              if (!pathname.endsWith("/admin")) {
                navigateWithTransition("/dashboard/admin");
              }
            }}
          >
            <Image
              src="/icons/dashboard/admin.png"
              alt="Admin"
              width={20}
              height={20}
              className="flex-shrink-0"
            />
            <span>Admin</span>
          </button>
        </div>

        <div className="flex-1" />
      </div>
    </aside>
  );
}

export default SideMenu;
