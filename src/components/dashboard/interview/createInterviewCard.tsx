"use client";

import React from "react";
import { Plus } from "lucide-react";
import { usePageTransition } from "@/components/PageTransition";

function CreateInterviewCard() {
  const { navigateWithTransition } = usePageTransition();

  return (
    <div
      className="flex items-center justify-center border-dashed border-gray-300 border-2 cursor-pointer w-[250px] min-w-[200px] max-w-[272px] h-[250px] rounded-[20px] shrink-0 overflow-hidden bg-white transition-all duration-300 ease-out hover:border-gray-400"
      onClick={() => {
        navigateWithTransition("/dashboard/create-interview");
      }}
    >
      <div className="flex items-center flex-col mx-auto">
        <div className="flex items-center justify-center w-full">
          <Plus size={72} strokeWidth={1.2} className="text-gray-700" />
        </div>
        <p className="mt-4 text-sm font-medium text-center text-gray-800">
          Create an Interview
        </p>
      </div>
    </div>
  );
}

export default CreateInterviewCard;
