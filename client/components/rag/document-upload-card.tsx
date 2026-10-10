"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

interface DocumentUploadCardProps {
  disabled?: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onError?: (message: string) => void;
}

export function DocumentUploadCard({ disabled, onUpload, onError }: DocumentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList?: FileList | File[]) {
    if (!fileList || uploading || disabled) {
      return;
    }

    const files = Array.from(fileList).filter((file) => {
      const lowerName = file.name.toLowerCase();
      return file.type === "application/pdf" || lowerName.endsWith(".pdf");
    });

    if (files.length === 0) {
      onError?.("Please upload PDF files only");
      return;
    }

    if (files.length > 10) {
      onError?.("You can upload up to 10 PDFs at a time");
      return;
    }

    setUploading(true);
    try {
      await onUpload(files);
    } catch (uploadError) {
      onError?.(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFiles(event.target.files || undefined);
  }

  return (
    <section className="panel-surface space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Ingestion</p>
          <h2 className="text-xl font-semibold text-slate-950">Upload PDFs</h2>
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        disabled={disabled || uploading}
        className={`relative flex min-h-32 w-full flex-col items-center justify-center rounded-[24px] border border-dashed px-5 py-5 text-center transition ${
          dragging
            ? "border-cyan-500 bg-cyan-50"
            : "border-slate-300 bg-white hover:border-cyan-400 hover:bg-cyan-50/60"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <div className="mb-3 rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-950/20">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
        </div>
        <h3 className="text-lg font-semibold text-slate-950">
          {uploading ? "Queuing documents..." : "Drop up to 10 PDFs or browse"}
        </h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">
          PDF only. Files are indexed asynchronously.
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onChange}
      />
    </section>
  );
}
