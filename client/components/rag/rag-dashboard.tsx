"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText } from "lucide-react";
import { deleteDocument, listDocuments, uploadDocuments } from "../../lib/api";
import { DocumentRecord } from "../../lib/types";
import { ChatPanel } from "./chat-panel";
import { DocumentList } from "./document-list";
import { DocumentUploadCard } from "./document-upload-card";
import { Toast } from "./toast";

export function RagDashboard() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [topK, setTopK] = useState(6);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshDocuments() {
    const response = await listDocuments();
    setDocuments(response.documents);
  }

  useEffect(() => {
    void (async () => {
      try {
        await refreshDocuments();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load documents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const hasInFlightDocuments = documents.some(
      (document) => document.status === "queued" || document.status === "processing"
    );

    if (!hasInFlightDocuments) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshDocuments().catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [documents]);

  useEffect(() => {
    if (documents.length === 0) {
      setSelectedDocumentId(null);
      return;
    }

    if (selectedDocumentId && documents.some((document) => document.id === selectedDocumentId)) {
      return;
    }

    const readyDocument = documents.find((document) => document.status === "ready");
    setSelectedDocumentId((readyDocument || documents[0]).id);
  }, [documents, selectedDocumentId]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) || null,
    [documents, selectedDocumentId]
  );

  async function handleUpload(files: File[]) {
    setError("");
    setNotice("");

    const response = await uploadDocuments(files);
    const uploadedIds = new Set(response.documents.map((document) => document.id));

    setDocuments((current) => [...response.documents, ...current.filter((item) => !uploadedIds.has(item.id))]);
    setSelectedDocumentId((current) => current || response.documents[0]?.id || null);
    setNotice(`Queued ${response.documents.length} PDF${response.documents.length > 1 ? "s" : ""} for ingestion.`);
    await refreshDocuments();
  }

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    setError("");
    setNotice("");
    try {
      await deleteDocument(documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
      setNotice("Document deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = {
    ready: documents.filter((document) => document.status === "ready").length,
    processing: documents.filter(
      (document) => document.status === "queued" || document.status === "processing"
    ).length,
    failed: documents.filter((document) => document.status === "failed").length,
  };

  useEffect(() => {
    if (!error && !notice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setError("");
      setNotice("");
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [error, notice]);

  return (
    <main className="rise-in mx-auto flex h-screen w-full max-w-[1600px] flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,420px)] flex-col gap-2">
        {error ? <Toast kind="error" message={error} onClose={() => setError("")} /> : null}
        {notice ? <Toast kind="success" message={notice} onClose={() => setNotice("")} /> : null}
      </div>

      <section className="panel-surface flex items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">PDF Workspace</h1>
          <p className="mt-1 text-sm text-slate-600">Upload, index, and chat with grounded document context.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
            Upload PDFs
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            Grounded answers
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Ready {stats.ready}
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            Processing {stats.processing}
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
            Failed {stats.failed}
          </span>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <span className="text-xs font-medium text-slate-600">Top-K</span>
            <input
              type="range"
              min={3}
              max={10}
              value={topK}
              onChange={(event) => setTopK(Number(event.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-cyan-600"
              aria-label="Top-K chunks"
            />
            <span className="w-4 text-center text-xs font-semibold text-slate-700">{topK}</span>
          </div>
          <Link
            href="/about"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300"
          >
            <BookOpenText className="h-3.5 w-3.5" />
            Docs
          </Link>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <DocumentUploadCard
            onUpload={handleUpload}
            disabled={loading}
            onError={(message) => {
              setNotice("");
              setError(message);
            }}
          />
          <div className="min-h-0 flex-1">
            <DocumentList
              documents={documents}
              selectedId={selectedDocumentId}
              isDeletingId={deletingId}
              onSelect={setSelectedDocumentId}
              onDelete={(documentId) => void handleDelete(documentId)}
            />
          </div>
        </div>

        <div className="min-h-0">
          <ChatPanel document={selectedDocument} topK={topK} />
        </div>
      </section>

      <Link
        href="/about"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-lg transition hover:border-slate-300"
      >
        <BookOpenText className="h-4 w-4" />
        Read docs
      </Link>
    </main>
  );
}
