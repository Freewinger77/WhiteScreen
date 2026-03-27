"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FileUp
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface CVUploaderProps {
  interviewId: string;
  onUploadComplete: () => void;
}

interface FileWithStatus {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  candidateName?: string;
  candidateEmail?: string;
}

const ACCEPTED_FORMATS = [
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function CVUploader({ interviewId, onUploadComplete }: CVUploaderProps) {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FileWithStatus[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      
      if (ACCEPTED_FORMATS.includes(extension) || ACCEPTED_FORMATS.includes(file.type)) {
        newFiles.push({
          file,
          id: `${file.name}-${Date.now()}-${i}`,
          status: "pending",
        });
      } else {
        toast.error(`Unsupported file format: ${file.name}`, {
          description: "Supported formats: PDF, TXT, DOC, DOCX",
        });
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFiles = async () => {
    const filesToUpload = files.filter((f) => f.status === "pending");
    
    if (filesToUpload.length === 0) {
      toast.error("Please select at least one CV file");
      return;
    }

    setIsUploading(true);

    // Mark pending files as uploading
    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const } : f))
    );

    const formData = new FormData();
    formData.append("interviewId", interviewId);
    
    // Use the filesToUpload we captured before state update
    filesToUpload.forEach((f) => {
      formData.append("files", f.file);
    });
    
    console.log("Uploading files:", filesToUpload.map(f => f.file.name));

    try {
      const response = await axios.post("/api/analyze-cv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // Update file statuses based on results
        interface CVResult {
          fileName: string;
          success: boolean;
          error?: string;
          candidateName?: string;
          candidateEmail?: string;
        }
        
        const resultMap = new Map<string, CVResult>(
          response.data.results.map((r: CVResult) => [r.fileName, r])
        );

        setFiles((prev) =>
          prev.map((f) => {
            const result = resultMap.get(f.file.name);
            if (result) {
              return {
                ...f,
                status: result.success ? ("success" as const) : ("error" as const),
                error: result.error,
                candidateName: result.candidateName,
                candidateEmail: result.candidateEmail,
              };
            }
            return f;
          })
        );

        const successCount = response.data.results.filter((r: any) => r.success).length;
        
        if (successCount > 0) {
          toast.success(`Successfully analyzed ${successCount} CV(s)`, {
            description: "Candidates have been added to the interview",
          });
          onUploadComplete();
        }
      }
    } catch (error: any) {
      console.error("Error uploading CVs:", error);
      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";
      toast.error(`Failed to upload CVs: ${errorMessage}`);
      
      // Mark all uploading files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading"
            ? { ...f, status: "error" as const, error: "Upload failed" }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "success"));
  };

  const pendingFiles = files.filter((f) => f.status === "pending");
  const pendingCount = pendingFiles.length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          isDragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FORMATS.join(",")}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <FileUp className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Drop CV files here</span> or{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-400">
          Supports PDF, TXT, DOC, DOCX • Multiple files allowed
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {files.length} file(s) selected
            </span>
            {successCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear completed
              </button>
            )}
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {files.map((fileWithStatus) => (
              <div
                key={fileWithStatus.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fileWithStatus.status === "success"
                    ? "bg-green-50 border-green-200"
                    : fileWithStatus.status === "error"
                    ? "bg-red-50 border-red-200"
                    : fileWithStatus.status === "uploading"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {fileWithStatus.file.name}
                    </p>
                    {fileWithStatus.status === "success" && fileWithStatus.candidateName && (
                      <p className="text-xs text-green-600">
                        {fileWithStatus.candidateName}
                        {fileWithStatus.candidateEmail && ` • ${fileWithStatus.candidateEmail}`}
                      </p>
                    )}
                    {fileWithStatus.status === "error" && fileWithStatus.error && (
                      <p className="text-xs text-red-600">{fileWithStatus.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fileWithStatus.status === "uploading" && (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                  {fileWithStatus.status === "success" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {fileWithStatus.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {fileWithStatus.status === "pending" && (
                    <button
                      onClick={() => removeFile(fileWithStatus.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <Button
          onClick={uploadFiles}
          disabled={isUploading || pendingCount === 0}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing {uploadingCount} CV(s)...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Analyze {pendingCount} CV(s)
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export default CVUploader;

