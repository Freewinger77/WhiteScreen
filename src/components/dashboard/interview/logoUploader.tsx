"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UploadCloud, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LogoUploaderProps {
  currentLogo?: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function LogoUploader({
  currentLogo,
  onSelect,
  onRemove,
  disabled = false,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      event.target.value = "";

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Logo must be smaller than 2MB.");
      event.target.value = "";

      return;
    }

    onSelect(file);
    event.target.value = "";
  };

  const triggerUpload = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-white overflow-hidden">
          {currentLogo ? (
            <Image
              src={currentLogo}
              alt="Interview logo"
              width={80}
              height={80}
              className="object-contain h-full w-full"
            />
          ) : (
            <UploadCloud className="h-8 w-8 text-gray-400" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={triggerUpload}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <UploadCloud className="h-4 w-4" />
            Upload logo
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
          {currentLogo ? (
            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-2 text-red-500 hover:text-red-600"
              onClick={onRemove}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
              Remove logo
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-gray-500">PNG, JPG, or SVG up to 2MB.</p>
    </div>
  );
}
