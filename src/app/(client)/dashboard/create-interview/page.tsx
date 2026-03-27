"use client";

import CreateInterviewModal from "@/components/dashboard/interview/createInterviewModal";
import { usePageTransition } from "@/components/PageTransition";

export default function CreateInterviewPage() {
  const { navigateWithTransition } = usePageTransition();

  return (
    <div className="w-full">
      <CreateInterviewModal
        open={true}
        setOpen={(open) => {
          if (!open) {
            navigateWithTransition("/dashboard");
          }
        }}
      />
    </div>
  );
}
