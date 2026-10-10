"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

interface ToastProps {
  kind: "error" | "success";
  message: string;
  onClose: () => void;
}

export function Toast({ kind, message, onClose }: ToastProps) {
  const isError = kind === "error";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
      role="status"
      aria-live="polite"
    >
      {isError ? <AlertCircle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
      <p className="max-w-sm leading-6">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto rounded-full p-1 opacity-70 transition hover:opacity-100"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
