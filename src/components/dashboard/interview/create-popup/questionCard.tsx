import { Question } from "@/types/interview";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuestionCardProps {
  questionNumber: number;
  questionData: Question;
  onQuestionChange: (id: string, question: Question) => void;
  onDelete: (id: string) => void;
}

const questionCard = ({
  questionNumber,
  questionData,
  onQuestionChange,
  onDelete,
}: QuestionCardProps) => {
  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Question {questionNumber}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800">
              Depth Level:
            </span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    className={`h-7 rounded-md px-3 text-xs ${
                      questionData?.follow_up_count == 1
                        ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    variant="secondary"
                    onClick={() =>
                      onQuestionChange(questionData.id, {
                        ...questionData,
                        follow_up_count: 1,
                      })
                    }
                  >
                    Low
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-200">
                  <p className="text-zinc-800">Brief follow-up</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    className={`h-7 rounded-md px-3 text-xs ${
                      questionData?.follow_up_count == 2
                        ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    variant="secondary"
                    onClick={() =>
                      onQuestionChange(questionData.id, {
                        ...questionData,
                        follow_up_count: 2,
                      })
                    }
                  >
                    Medium
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-200">
                  <p className="text-zinc-800">Moderate follow-up</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    className={`h-7 rounded-md px-3 text-xs ${
                      questionData?.follow_up_count == 3
                        ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    variant="secondary"
                    onClick={() =>
                      onQuestionChange(questionData.id, {
                        ...questionData,
                        follow_up_count: 3,
                      })
                    }
                  >
                    High
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-200">
                  <p className="text-zinc-800">In-depth follow-up</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button
              type="button"
              className="ml-1 rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600"
              onClick={() => onDelete(questionData.id)}
              aria-label="Delete question"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <textarea
          value={questionData?.question}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="e.g can you tell me a challenging problem you’ve worked on?"
          rows={3}
          onChange={(e) =>
            onQuestionChange(questionData.id, {
              ...questionData,
              question: e.target.value,
            })
          }
          onBlur={(e) =>
            onQuestionChange(questionData.id, {
              ...questionData,
              question: e.target.value.trim(),
            })
          }
        />
      </div>
    </>
  );
};
export default questionCard;
