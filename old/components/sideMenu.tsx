"use client";

import React from "react";
import { PlayCircleIcon, SpeechIcon, ShieldIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function SideMenu() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="z-[10] bg-slate-100 p-6 w-[200px] fixed top-[64px] left-0 h-full">
      <div className="flex flex-col gap-1">
        <div className="flex flex-col justify-between gap-2">
          <div
            className={`flex flex-row p-3 rounded-md hover:bg-slate-200 cursor-pointer ${
              pathname.endsWith("/dashboard") ||
              pathname.includes("/interviews")
                ? "bg-orange-200"
                : "bg-slate-100"
            }`}
            onClick={() => {
              if (!pathname.endsWith("/dashboard")) {
                router.push("/dashboard");
              }
            }}
          >
            <PlayCircleIcon className="font-thin	 mr-2" />
            <p className="font-medium ">Interviews</p>
          </div>
          <div
            className={`flex flex-row p-3 rounded-md hover:bg-slate-200 cursor-pointer ${
              pathname.endsWith("/interviewers")
                ? "bg-orange-200"
                : "bg-slate-100"
            }`}
            onClick={() => {
              if (!pathname.endsWith("/interviewers")) {
                router.push("/dashboard/interviewers");
              }
            }}
          >
            <SpeechIcon className="font-thin mr-2" />
            <p className="font-medium ">Interviewers</p>
          </div>
          <div
            className={`flex flex-row p-3 rounded-md hover:bg-slate-200 cursor-pointer ${
              pathname.endsWith("/admin")
                ? "bg-orange-200"
                : "bg-slate-100"
            }`}
            onClick={() => {
              if (!pathname.endsWith("/admin")) {
                router.push("/dashboard/admin");
              }
            }}
          >
            <ShieldIcon className="font-thin mr-2" />
            <p className="font-medium ">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SideMenu;
