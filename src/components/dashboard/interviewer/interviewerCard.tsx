"use client";

import { useState } from "react";
import Image from "next/image";
import Modal from "@/components/dashboard/Modal";
import { Interviewer } from "@/types/interviewer";
import InterviewerDetailsModal from "@/components/dashboard/interviewer/interviewerDetailsModal";

interface Props {
  interviewer: Interviewer;
}

const InterviewerCard = ({ interviewer }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="w-[200px] h-[200px] bg-[#F9F9FA] rounded-[20px] cursor-pointer transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02] flex flex-col items-center justify-center p-4"
        onClick={() => setOpen(true)}
      >
        {/* Avatar */}
        <div className="w-28 h-28 rounded-full overflow-hidden bg-white flex items-center justify-center">
          <Image
            src={interviewer.image}
            alt={`${interviewer.name}`}
            width={112}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Name */}
        <p className="mt-4 text-sm font-medium text-gray-900 text-center">
          {interviewer.name}
        </p>
      </div>

      <Modal
        open={open}
        closeOnOutsideClick={true}
        onClose={() => {
          setOpen(false);
        }}
      >
        <InterviewerDetailsModal interviewer={interviewer} />
      </Modal>
    </>
  );
};

export default InterviewerCard;
