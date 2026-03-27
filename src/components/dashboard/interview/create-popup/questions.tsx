import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { InterviewBase, Question } from "@/types/interview";
import QuestionCard from "@/components/dashboard/interview/create-popup/questionCard";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
    questions.every((q) => q.question.trim() !== "");

  return (
    <div className="w-full animate-fadeIn">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Interview Description
            </p>
            <p className="text-xs italic text-gray-500">
              Note: interviewees will see this description.
            </p>
          </div>
          <Textarea
            value={description}
            className="min-h-[104px] resize-none"
            placeholder="Enter your interview description"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={(e) => setDescription(e.target.value.trim())}
          />
        </div>

        <p className="mt-8 text-sm font-semibold text-gray-900">
          Create Questions
        </p>
        <p className="mt-1 text-sm italic text-gray-600">
          These questions will be used during candidate interviews. Kindly
          review them to ensure they are appropriate.
        </p>

        <div className="mt-4 space-y-3">
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
          <button
            type="button"
            onClick={handleAddQuestion}
            className="mt-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl py-6 text-gray-500 hover:text-gray-700"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs">Add more questions</span>
          </button>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button variant="secondary" disabled>
            Save as Draft
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="bg-black text-white hover:bg-black/90"
          >
            Next Step
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuestionsPopup;
