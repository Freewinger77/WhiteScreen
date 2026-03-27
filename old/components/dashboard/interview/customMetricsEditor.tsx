"use client";

import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { CustomMetric, MetricType } from "@/types/interview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Info, AlertCircle, Scale, ToggleLeft } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomMetricsEditorProps {
  metrics: CustomMetric[];
  onChange: (metrics: CustomMetric[]) => void;
  disabled?: boolean;
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

function CustomMetricsEditor({
  metrics,
  onChange,
  disabled = false,
}: CustomMetricsEditorProps) {
  const [localMetrics, setLocalMetrics] = useState<CustomMetric[]>(metrics);
  const [totalWeight, setTotalWeight] = useState(0);
  const [showWeightWarning, setShowWeightWarning] = useState(false);

  useEffect(() => {
    setLocalMetrics(metrics);
  }, [metrics]);

  useEffect(() => {
    const total = localMetrics.reduce((sum, m) => sum + m.weight, 0);
    setTotalWeight(total);
    setShowWeightWarning(localMetrics.length > 0 && total !== 10);
  }, [localMetrics]);

  const handleAddMetric = (type: MetricType = "scale") => {
    const newMetric: CustomMetric = {
      id: uuidv4(),
      title: "",
      description: "",
      weight: 1,
      type,
    };
    const updatedMetrics = [...localMetrics, newMetric];
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const handleRemoveMetric = (id: string) => {
    const updatedMetrics = localMetrics.filter((m) => m.id !== id);
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const handleMetricChange = (
    id: string,
    field: keyof CustomMetric,
    value: string | number
  ) => {
    const updatedMetrics = localMetrics.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  const handleUseDefaults = () => {
    setLocalMetrics(DEFAULT_METRICS);
    onChange(DEFAULT_METRICS);
  };

  const autoBalanceWeights = () => {
    if (localMetrics.length === 0) return;
    
    const weightPerMetric = Math.floor(10 / localMetrics.length);
    const remainder = 10 - (weightPerMetric * localMetrics.length);
    
    const updatedMetrics = localMetrics.map((m, index) => ({
      ...m,
      weight: weightPerMetric + (index === 0 ? remainder : 0),
    }));
    
    setLocalMetrics(updatedMetrics);
    onChange(updatedMetrics);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold">Custom Evaluation Metrics</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-gray-700 text-white p-3">
                <p className="text-sm">
                  Define custom metrics to evaluate candidates. Each metric has a
                  weight that determines its importance in the overall score.
                  Weights should add up to 10.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {localMetrics.length === 0 && !disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseDefaults}
            className="text-xs"
          >
            Use Default Metrics
          </Button>
        )}
      </div>

      {localMetrics.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              totalWeight === 10
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <span className="font-medium">Total Weight:</span>
            <span className="font-bold">{totalWeight}/10</span>
            {totalWeight !== 10 && (
              <AlertCircle className="h-4 w-4" />
            )}
          </div>
          {showWeightWarning && !disabled && (
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

      <div className="space-y-3">
        {localMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className={`border rounded-lg p-4 shadow-sm ${
              metric.type === "boolean" 
                ? "border-purple-200 bg-purple-50" 
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Metric Title
                    </label>
                    <Input
                      value={metric.title}
                      onChange={(e) =>
                        handleMetricChange(metric.id, "title", e.target.value)
                      }
                      placeholder={metric.type === "boolean" ? "e.g., Has relevant experience?" : "e.g., Technical Ability"}
                      disabled={disabled}
                      className="text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Type
                    </label>
                    <Select
                      value={metric.type || "scale"}
                      onValueChange={(value: MetricType) =>
                        handleMetricChange(metric.id, "type", value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scale">
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            Scale (0-10)
                          </div>
                        </SelectItem>
                        <SelectItem value="boolean">
                          <div className="flex items-center gap-1">
                            <ToggleLeft className="h-3 w-3" />
                            Yes/No
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Weight
                    </label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[metric.weight]}
                        onValueChange={(value) =>
                          handleMetricChange(metric.id, "weight", value[0])
                        }
                        max={10}
                        min={1}
                        step={1}
                        disabled={disabled}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold text-indigo-600 w-5 text-center">
                        {metric.weight}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    {metric.type === "boolean" 
                      ? "Question to check (Yes = 10, No = 1)" 
                      : "Description (What to evaluate)"}
                  </label>
                  <Textarea
                    value={metric.description}
                    onChange={(e) =>
                      handleMetricChange(metric.id, "description", e.target.value)
                    }
                    placeholder={metric.type === "boolean" 
                      ? "e.g., Does the candidate have 3+ years of experience in the field?" 
                      : "Describe what should be evaluated for this metric..."}
                    disabled={disabled}
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
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMetric(metric.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddMetric("scale")}
            className="flex-1 border-dashed border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50"
          >
            <Scale className="h-4 w-4 mr-2" />
            Add Scale Metric (0-10)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddMetric("boolean")}
            className="flex-1 border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50"
          >
            <ToggleLeft className="h-4 w-4 mr-2" />
            Add Yes/No Metric
          </Button>
        </div>
      )}

      {localMetrics.length === 0 && (
        <p className="text-sm text-gray-500 italic text-center py-4">
          No custom metrics defined. Standard evaluation criteria will be used.
        </p>
      )}
    </div>
  );
}

export default CustomMetricsEditor;

