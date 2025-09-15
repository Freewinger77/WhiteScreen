"use client";

import React from "react";
import { PlayCircleIcon, SpeechIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function SideMenu() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="z-[10] bg-gray-50 border-r border-gray-200 p-6 w-[200px] fixed top-[64px] left-0 h-full">
      <div className="flex flex-col gap-1">
        <div className="flex flex-col justify-between gap-2">
          <div
            className={`flex flex-row p-3 rounded-lg hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors duration-200 ${
              pathname.endsWith("/dashboard") ||
              pathname.includes("/interviews")
                ? "bg-orange-100 text-orange-600 border border-orange-200"
                : "bg-gray-50 text-gray-700"
            }`}
            onClick={() => router.push("/dashboard")}
          >
            <PlayCircleIcon className="font-thin mr-2 w-5 h-5" />
            <p className="font-medium">Interviews</p>
          </div>
          <div
            className={`flex flex-row p-3 rounded-lg hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-colors duration-200 ${
              pathname.endsWith("/interviewers")
                ? "bg-orange-100 text-orange-600 border border-orange-200"
                : "bg-gray-50 text-gray-700"
            }`}
            onClick={() => router.push("/dashboard/interviewers")}
          >
            <SpeechIcon className="font-thin mr-2 w-5 h-5" />
            <p className="font-medium">Interviewers</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideMenu;
