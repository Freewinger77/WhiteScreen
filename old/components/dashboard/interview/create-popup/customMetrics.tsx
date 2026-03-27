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
    <div className="w-full max-w-[38rem] min-w-[320px] min-h-[30rem] flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-xl font-semibold">Evaluation Metrics</h1>
        <div className="w-16" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="w-8 h-1 bg-indigo-600 rounded" />
        <div className="w-8 h-1 bg-indigo-600 rounded" />
        <div className="w-8 h-1 bg-indigo-600 rounded" />
      </div>

      {/* Description */}
      <div className="px-6 py-2">
        <p className="text-sm text-gray-600 text-center">
          Define custom metrics to evaluate candidates. This step is optional.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6">
        {/* Weight indicator */}
        {metrics.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                totalWeight === 10
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <span className="font-medium">Total Weight:</span>
              <span className="font-bold">{totalWeight}/10</span>
              {totalWeight !== 10 && <AlertCircle className="h-4 w-4" />}
            </div>
            {totalWeight !== 10 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={autoBalanceWeights}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Auto-balance weights
              </Button>
            )}
          </div>
        )}

        {/* Metrics list */}
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div
              key={metric.id}
              className={`border rounded-lg p-4 shadow-sm ${
                metric.type === "boolean" 
                  ? "border-purple-200 bg-purple-50" 
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-semibold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Metric Title *
                      </label>
                      <Input
                        value={metric.title}
                        onChange={(e) =>
                          handleMetricChange(metric.id, "title", e.target.value)
                        }
                        placeholder={metric.type === "boolean" ? "e.g., Has relevant experience?" : "e.g., Technical Ability"}
                        className="text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Type
                      </label>
                      <Select
                        value={metric.type || "scale"}
                        onValueChange={(value: MetricType) =>
                          handleMetricChange(metric.id, "type", value)
                        }
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scale">
                            <div className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              <span>0-10</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="boolean">
                            <div className="flex items-center gap-1">
                              <ToggleLeft className="h-3 w-3" />
                              <span>Yes/No</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Weight
                      </label>
                      <div className="flex items-center gap-1">
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
                        <span className="text-sm font-bold text-indigo-600 w-4 text-center">
                          {metric.weight}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {metric.type === "boolean" 
                        ? "Question to check (Yes = 10, No = 1) *" 
                        : "Description (What to evaluate) *"}
                    </label>
                    <Textarea
                      value={metric.description}
                      onChange={(e) =>
                        handleMetricChange(metric.id, "description", e.target.value)
                      }
                      placeholder={metric.type === "boolean" 
                        ? "e.g., Does the candidate have 3+ years of experience in the field?" 
                        : "Describe what should be evaluated for this metric..."}
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </div>
                  {metric.type === "boolean" && (
                    <p className="text-xs text-purple-600 italic">
                      ℹ️ Boolean metrics score 10 if YES, 1 if NO or not enough evidence
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMetric(metric.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add metric buttons */}
        <div className="flex gap-2 mt-4 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddMetric("scale")}
            className="flex-1 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs"
          >
            <Scale className="h-3 w-3 mr-1" />
            Add Scale Metric
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddMetric("boolean")}
            className="flex-1 border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50 text-xs"
          >
            <ToggleLeft className="h-3 w-3 mr-1" />
            Add Yes/No Metric
          </Button>
          {metrics.length === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleUseDefaults}
              className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-xs"
            >
              Use Defaults
            </Button>
          )}
        </div>

        {metrics.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Scale className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No custom metrics defined yet.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Standard evaluation criteria will be used if you skip this step.
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Footer buttons */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <Button
          variant="ghost"
          onClick={handleSkipAndCreate}
          disabled={isSubmitting}
          className="text-gray-500"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
                  className="bg-indigo-600 hover:bg-indigo-800"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
  );
}

export default CustomMetricsPopup;
