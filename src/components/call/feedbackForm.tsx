import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackData } from "@/types/response";

enum SatisfactionLevel {
  Positive = "😀",
  Moderate = "😐",
  Negative = "😔",
}

interface FeedbackFormProps {
  onSubmit: (data: Omit<FeedbackData, "interview_id">) => void;
  email?: string;
}

export function FeedbackForm({ onSubmit, email }: FeedbackFormProps) {
  const [satisfaction, setSatisfaction] = useState<SatisfactionLevel>(
    SatisfactionLevel.Moderate,
  );
  const [feedback, setFeedback] = useState("");

  const handleSubmit = () => {
    if (satisfaction !== null || feedback.trim() !== "") {
      onSubmit({
        satisfaction: Object.values(SatisfactionLevel).indexOf(satisfaction),
        feedback,
        email: email ?? null,
      });
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Are you satisfied with the platform?
      </h3>
      <div className="flex justify-center space-x-4 mb-4">
        {Object.values(SatisfactionLevel).map((emoji) => (
          <button
            key={emoji}
            className={`text-4xl p-2 rounded-lg transition-all ${
              satisfaction === emoji 
                ? "bg-violet-600/30 ring-2 ring-violet-500 scale-110" 
                : "hover:bg-white/10"
            }`}
            onClick={() => setSatisfaction(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <Textarea
        value={feedback}
        placeholder="Add your feedback here..."
        className="mb-4 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-violet-500"
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button
        disabled={satisfaction === null && feedback.trim() === ""}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/30"
        onClick={handleSubmit}
      >
        Submit Feedback
      </Button>
    </div>
  );
}
