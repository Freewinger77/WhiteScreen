"use client";

import { toast } from "sonner";
import { FileText, Inbox } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { parsePdf } from "@/actions/parse-pdf";

type Props = {
  isUploaded: boolean;
  setIsUploaded: (isUploaded: boolean) => void;
  fileName: string;
  setFileName: (fileName: string) => void;
  setUploadedDocumentContext: (context: string) => void;
};

function FileUpload({
  isUploaded,
  setIsUploaded,
  fileName,
  setFileName,
  setUploadedDocumentContext,
}: Props) {
  const [uploading, setUploading] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      setFileName(file.name);
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Please upload a file smaller than 10MB.", {
          position: "bottom-right",
          duration: 3000,
        });

        return;
      }

      try {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const result = await parsePdf(formData);
        if (!result.success) {
          throw new Error(result.error);
        }
        const fullText = result.text || "";
        setUploadedDocumentContext(fullText);
        setIsUploaded(true);
      } catch (error) {
        console.log(error);
        toast.error("Error reading PDF", {
          description: "Please try again.",
          duration: 3000,
        });
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <div className="w-full">
      {!isUploaded ? (
        <div
          {...getRootProps({
            className:
              "cursor-pointer py-6 flex justify-center items-center flex-col",
          })}
        >
          <input {...getInputProps()} />
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <FileText className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-3 text-sm text-gray-700">
            Drag and drop PDF here
          </p>
          {uploading && (
            <p className="mt-2 text-xs text-gray-500">Reading PDF…</p>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-gray-700">
            ✓ {fileName}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            <span
              className="cursor-pointer underline font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setIsUploaded(false)}
            >
              Reupload
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
