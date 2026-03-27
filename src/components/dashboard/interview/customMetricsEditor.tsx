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
      {/* Weight indicator */}
      {localMetrics.length > 0 && (
        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
              totalWeight === 10
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            Total Weight: <span className="font-semibold">{totalWeight}/10</span>
            {totalWeight !== 10 && <AlertCircle className="h-3.5 w-3.5" />}
          </div>
          {showWeightWarning && !disabled && (
            <button
              type="button"
              onClick={autoBalanceWeights}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              Auto-balance
            </button>
          )}
        </div>
      )}

      {/* Metrics list */}
      <div className="space-y-3">
        {localMetrics.map((metric, index) => (
          <div
            key={metric.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 animate-fadeIn"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500">Metric {index + 1}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveMetric(metric.id)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Title and Type row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title</label>
                  <input
                    value={metric.title}
                    onChange={(e) => handleMetricChange(metric.id, "title", e.target.value)}
                    placeholder={metric.type === "boolean" ? "Has relevant experience?" : "Technical Ability"}
                    disabled={disabled}
                    className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 border-b border-gray-200 py-2 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Type</label>
                  <Select
                    value={metric.type || "scale"}
                    onValueChange={(value: MetricType) => handleMetricChange(metric.id, "type", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9 border-0 border-b border-gray-200 rounded-none text-sm bg-transparent focus:ring-0 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scale">Scale (0-10)</SelectItem>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Weight slider */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Weight</label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[metric.weight]}
                    onValueChange={(value) => handleMetricChange(metric.id, "weight", value[0])}
                    max={10}
                    min={1}
                    step={1}
                    disabled={disabled}
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm font-semibold text-gray-900">
                    {metric.weight}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  {metric.type === "boolean" ? "Question to evaluate" : "Description"}
                </label>
                <textarea
                  value={metric.description}
                  onChange={(e) => handleMetricChange(metric.id, "description", e.target.value)}
                  placeholder={metric.type === "boolean" 
                    ? "Does the candidate have 3+ years of experience?" 
                    : "Describe what should be evaluated..."}
                  disabled={disabled}
                  rows={2}
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-gray-300"
                />
                {metric.type === "boolean" && (
                  <p className="mt-1.5 text-[11px] text-gray-500 italic">
                    Scores 10 if YES, 1 if NO or insufficient evidence
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add metric button */}
      {!disabled && (
        <button
          type="button"
          onClick={() => handleAddMetric("scale")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add metric
        </button>
      )}

      {/* Empty state */}
      {localMetrics.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Scale className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-600">No custom metrics</p>
          <p className="mt-1 text-xs text-gray-500">Standard evaluation will be used</p>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseDefaults}
              className="mt-4 text-xs"
            >
              Use Defaults
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default CustomMetricsEditor;

