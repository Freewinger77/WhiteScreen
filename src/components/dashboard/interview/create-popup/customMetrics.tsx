"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { useClerk, useOrganization } from "@clerk/nextjs";
import { InterviewBase, CustomMetric, MetricType } from "@/types/interview";
import { useInterviews } from "@/contexts/interviews.context";
import { ChevronLeft, Plus, Trash2, Scale, AlertCircle, ToggleLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  interviewData: InterviewBase;
  setInterviewData: (data: InterviewBase) => void;
  logoFile: File | null;
  onBack: () => void;
  setOpen: (open: boolean) => void;
}

const DEFAULT_METRICS: CustomMetric[] = [
  {
    id: "technical_ability",
    title: "Technical Ability",
    description: "Evaluate technical knowledge, problem-solving skills, and domain expertise demonstrated during the interview.",
    weight: 5,
    type: "scale",
  },
  {
    id: "soft_skills",
    title: "Soft Skills",
    description: "Assess communication, teamwork, adaptability, and interpersonal skills shown in responses.",
    weight: 5,
    type: "scale",
  },
];

function CustomMetricsPopup({ interviewData, setInterviewData, logoFile, onBack, setOpen }: Props) {
  const { user } = useClerk();
  const { organization } = useOrganization();
  const { fetchInterviews } = useInterviews();
  
  const [metrics, setMetrics] = useState<CustomMetric[]>(interviewData.custom_metrics || []);
  const [totalWeight, setTotalWeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const total = metrics.reduce((sum, m) => sum + m.weight, 0);
    setTotalWeight(total);
  }, [metrics]);

  const handleAddMetric = (type: MetricType = "scale") => {
    const newMetric: CustomMetric = {
      id: uuidv4(),
      title: "",
      description: "",
      weight: 1,
      type,
    };
    setMetrics([...metrics, newMetric]);
  };

  const handleRemoveMetric = (id: string) => {
    setMetrics(metrics.filter((m) => m.id !== id));
  };

  const handleMetricChange = (
    id: string,
    field: keyof CustomMetric,
    value: string | number | MetricType
  ) => {
    setMetrics(metrics.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleUseDefaults = () => {
    setMetrics(DEFAULT_METRICS);
  };

  const autoBalanceWeights = () => {
    if (metrics.length === 0) return;
    
    const weightPerMetric = Math.floor(10 / metrics.length);
    const remainder = 10 - (weightPerMetric * metrics.length);
    
    setMetrics(metrics.map((m, index) => ({
      ...m,
      weight: weightPerMetric + (index === 0 ? remainder : 0),
    })));
  };

  const handleCreateInterview = async () => {
    setIsSubmitting(true);
    try {
      const finalInterviewData = {
        ...interviewData,
        user_id: user?.id || "",
        organization_id: organization?.id || "",
        custom_metrics: metrics.length > 0 ? metrics : undefined,
      };

      const sanitizedInterviewData = {
        ...finalInterviewData,
        interviewer_id: finalInterviewData.interviewer_id.toString(),
        response_count: finalInterviewData.response_count.toString(),
        logo_url: logoFile ? null : organization?.imageUrl || null,
      };

      const formData = new FormData();
      formData.append("interviewData", JSON.stringify(sanitizedInterviewData));
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await axios.post("/api/create-interview", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-organization-name": organization?.name || "",
        },
      });

      if (response.status === 200) {
        toast.success("Interview created successfully.");
        fetchInterviews();
        setOpen(false);
      }
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to create interview. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipAndCreate = async () => {
    // Clear metrics and create
    setMetrics([]);
    setIsSubmitting(true);
    try {
      const finalInterviewData = {
        ...interviewData,
        user_id: user?.id || "",
        organization_id: organization?.id || "",
        custom_metrics: undefined,
      };

      const sanitizedInterviewData = {
        ...finalInterviewData,
        interviewer_id: finalInterviewData.interviewer_id.toString(),
        response_count: finalInterviewData.response_count.toString(),
        logo_url: logoFile ? null : organization?.imageUrl || null,
      };

      const formData = new FormData();
      formData.append("interviewData", JSON.stringify(sanitizedInterviewData));
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await axios.post("/api/create-interview", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "x-organization-name": organization?.name || "",
        },
      });

      if (response.status === 200) {
        toast.success("Interview created successfully.");
        fetchInterviews();
        setOpen(false);
      }
    } catch (error) {
      console.error("Error creating interview:", error);
      toast.error("Failed to create interview. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = metrics.length === 0 || (
    totalWeight === 10 &&
    metrics.every(m => m.title.trim() !== "" && m.description.trim() !== "")
  );

  return (
    <div className="w-full animate-fadeIn">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            {metrics.length > 0 && (
              <>
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    totalWeight === 10
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <span className="inline-flex h-2 w-2 rounded-full bg-current opacity-70" />
                  Total Weight:{" "}
                  <span className="font-semibold">{totalWeight}/10</span>
                  {totalWeight !== 10 && <AlertCircle className="h-4 w-4" />}
                </div>
                {totalWeight !== 10 && (
                  <button
                    type="button"
                    onClick={autoBalanceWeights}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Auto-balance Weights
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Custom Evaluation Metrics
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Define custom metrics to evaluate candidates. This step is optional.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.id}
              className="rounded-2xl border border-gray-200 bg-white p-5"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-gray-900">
                  Metric {index + 1}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRemoveMetric(metric.id)}
                  disabled={isSubmitting}
                  className="h-7 rounded-full px-3 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Metric Title
                  </label>
                  <Input
                    value={metric.title}
                    onChange={(e) =>
                      handleMetricChange(metric.id, "title", e.target.value)
                    }
                    placeholder={
                      metric.type === "boolean"
                        ? "Has relevant experience?"
                        : "Technical Ability"
                    }
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Type
                  </label>
                  <Select
                    value={metric.type || "scale"}
                    onValueChange={(value: MetricType) =>
                      handleMetricChange(metric.id, "type", value)
                    }
                  >
                    <SelectTrigger className="mt-2 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scale">Scale (0-10)</SelectItem>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Weight
                  </label>
                  <div className="mt-4 flex items-center gap-3">
                    <Slider
                      value={[metric.weight]}
                      onValueChange={(value) =>
                        handleMetricChange(metric.id, "weight", value[0])
                      }
                      max={10}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-6 text-right text-sm font-semibold text-indigo-600">
                      {metric.weight}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Description (What to evaluate)
                  </label>
                  <Textarea
                    value={metric.description}
                    onChange={(e) =>
                      handleMetricChange(metric.id, "description", e.target.value)
                    }
                    placeholder="Describe what should be evaluated for this metric..."
                    rows={3}
                    className="mt-2 resize-none"
                  />
                  {metric.type === "boolean" && (
                    <p className="mt-2 text-xs italic text-gray-500">
                      Note: Boolean metrics score 10 if YES, 1 if NO or not
                      enough evidence.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => handleAddMetric("scale")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-5 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <Plus className="h-4 w-4" />
            Add more metrics
          </button>

          {metrics.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <Scale className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">
                No custom metrics defined yet
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Standard evaluation criteria will be used if you skip this step.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUseDefaults}
                  className="text-xs"
                >
                  Use Defaults
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddMetric("boolean")}
                  className="text-xs"
                >
                  Add Yes/No Metric
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={handleSkipAndCreate}
            disabled={isSubmitting}
            className="bg-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Skip & Create Interview"
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleCreateInterview}
                    disabled={!isValid || isSubmitting}
                    className="bg-black text-white hover:bg-black/90"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Interview"
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isValid && metrics.length > 0 && (
                <TooltipContent className="bg-red-600 text-white">
                  <p>Weights must sum to 10 and all fields must be filled</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default CustomMetricsPopup;
