"use client";

import { useMemo, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { DocumentRecord } from "../../lib/types";

interface DocumentListProps {
  documents: DocumentRecord[];
  selectedId: string | null;
  isDeletingId?: string | null;
  onSelect: (documentId: string) => void;
  onDelete: (documentId: string) => void;
}

const statusStyles: Record<DocumentRecord["status"], string> = {
  queued: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-sky-50 text-sky-700 border-sky-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
};

export function DocumentList({
  documents,
  selectedId,
  isDeletingId,
  onSelect,
  onDelete,
}: DocumentListProps) {
  const [filter, setFilter] = useState<"all" | DocumentRecord["status"]>("all");

  const filteredDocuments = useMemo(() => {
    if (filter === "all") {
      return documents;
    }

    return documents.filter((document) => document.status === filter);
  }, [documents, filter]);

  const counts = useMemo(
    () => ({
      all: documents.length,
      queued: documents.filter((document) => document.status === "queued").length,
      processing: documents.filter((document) => document.status === "processing").length,
      ready: documents.filter((document) => document.status === "ready").length,
      failed: documents.filter((document) => document.status === "failed").length,
    }),
    [documents]
  );

  return (
    <section className="panel-surface flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h2 className="text-2xl font-semibold text-slate-950">Indexed documents</h2>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">{documents.length}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All", count: counts.all },
          { key: "ready", label: "Ready", count: counts.ready },
          { key: "queued", label: "Queued", count: counts.queued },
          { key: "processing", label: "Processing", count: counts.processing },
          { key: "failed", label: "Failed", count: counts.failed },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key as "all" | DocumentRecord["status"])}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === item.key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredDocuments.length === 0 ? (
          <div className="flex min-h-full items-center">
            <div className="w-full rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm leading-6 text-slate-500">
              {documents.length === 0
                ? "No documents yet. Upload one to start the retrieval pipeline."
                : `No ${filter} documents right now.`}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((document) => {
            const selected = document.id === selectedId;
            return (
              <button
                key={document.id}
                type="button"
                onClick={() => onSelect(document.id)}
                className={`w-full rounded-[26px] border p-4 text-left transition ${
                  selected
                    ? "border-cyan-500 bg-cyan-50 shadow-lg shadow-cyan-100"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-950 p-2 text-white">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{document.originalName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(document.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {document.summary ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{document.summary}</p>
                    ) : null}
                    {document.errorMessage ? (
                      <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {document.errorMessage}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[document.status]}`}>
                      {document.status}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(document.id);
                      }}
                      className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
                      aria-label={`Delete ${document.originalName}`}
                    >
                      {isDeletingId === document.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(document.updatedAt).toLocaleString()}</span>
                  <span>{document.chunkCount} chunks</span>
                </div>
              </button>
            );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
