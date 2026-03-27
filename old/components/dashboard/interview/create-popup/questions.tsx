import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { InterviewBase, Question } from "@/types/interview";
import { ScrollArea } from "@/components/ui/scroll-area";
import QuestionCard from "@/components/dashboard/interview/create-popup/questionCard";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  interviewData: InterviewBase;
  setInterviewData: (data: InterviewBase) => void;
  logoFile: File | null;
  onBack: () => void;
  onNext: () => void;
}

function QuestionsPopup({ interviewData, setInterviewData, logoFile, onBack, onNext }: Props) {
  const [questions, setQuestions] = useState<Question[]>(
    interviewData.questions,
  );
  const [description, setDescription] = useState<string>(
    interviewData.description?.trim() || "",
  );

  const endOfListRef = useRef<HTMLDivElement>(null);
  const prevQuestionLengthRef = useRef(questions.length);

  const handleInputChange = (id: string, newQuestion: Question) => {
    setQuestions(
      questions.map((question) =>
        question.id === id ? { ...question, ...newQuestion } : question,
      ),
    );
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length === 1) {
      setQuestions(
        questions.map((question) => ({
          ...question,
          question: "",
          follow_up_count: 1,
        })),
      );
      return;
    }
    setQuestions(questions.filter((question) => question.id !== id));
  };

  const handleAddQuestion = () => {
    if (questions.length < interviewData.question_count) {
      setQuestions([
        ...questions,
        { id: uuidv4(), question: "", follow_up_count: 1 },
      ]);
    }
  };

  const handleNext = () => {
    // Save questions and description to interview data and proceed
    setInterviewData({
      ...interviewData,
      questions: questions,
      description: description.trim(),
    });
    onNext();
  };

  useEffect(() => {
    if (questions.length > prevQuestionLengthRef.current) {
      endOfListRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevQuestionLengthRef.current = questions.length;
  }, [questions.length]);

  const isValid = 
    questions.length >= interviewData.question_count &&
    description.trim() !== "" &&
    questions.every((q) => q.question.trim() !== "");

  return (
    <div className="w-full max-w-[38rem] min-w-[320px] min-h-[30rem] flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-xl font-semibold">Review Questions</h1>
        <div className="w-16" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-8 h-1 bg-indigo-600 rounded" />
        <div className="w-8 h-1 bg-indigo-600 rounded" />
        <div className="w-8 h-1 bg-gray-300 rounded" />
      </div>

      {/* Description */}
      <div className="px-6 py-2">
        <p className="text-sm text-gray-600 text-center">
          Review and edit the interview questions. These will be used during the interviews.
        </p>
      </div>

      {/* Questions List */}
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-2">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              questionNumber={index + 1}
              questionData={question}
              onDelete={handleDeleteQuestion}
              onQuestionChange={handleInputChange}
            />
          ))}
          <div ref={endOfListRef} />
        </div>
        
        {questions.length < interviewData.question_count && (
          <div
            className="flex items-center justify-center py-3 cursor-pointer opacity-75 hover:opacity-100"
            onClick={handleAddQuestion}
          >
            <Plus
              size={40}
              strokeWidth={2.2}
              className="text-indigo-600"
            />
          </div>
        )}

        {/* Description field */}
        <div className="mt-4 mb-4">
          <p className="font-medium text-sm mb-1">
            Interview Description
            <span className="text-xs text-gray-500 font-normal ml-2">
              (Interviewees will see this)
            </span>
          </p>
          <textarea
            value={description}
            className="w-full h-20 py-2 px-3 border-2 rounded-md border-gray-300 text-sm"
            placeholder="Enter your interview description..."
            onChange={(e) => setDescription(e.target.value)}
            onBlur={(e) => setDescription(e.target.value.trim())}
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center justify-end px-6 py-4 border-t">
        <Button
          onClick={handleNext}
          disabled={!isValid}
          className="bg-indigo-600 hover:bg-indigo-800"
        >
          Continue to Evaluation Metrics
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export default QuestionsPopup;
