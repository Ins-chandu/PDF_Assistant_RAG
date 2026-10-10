import Link from "next/link";
import {
  ArrowLeft,
  Blocks,
  Bot,
  CircleDollarSign,
  Database,
  FileText,
  Server,
  Workflow,
} from "lucide-react";

export default function AboutPage() {
  return (
    <main className="doc-page mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-white/35 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>
        <div className="flex flex-wrap gap-2">
          <div className="doc-kpi">
            <Workflow className="h-4 w-4" />
            <span>Async Ingestion</span>
          </div>
          <div className="doc-kpi">
            <Database className="h-4 w-4" />
            <span>Qdrant Retrieval</span>
          </div>
          <div className="doc-kpi">
            <Bot className="h-4 w-4" />
            <span>Gemini Embeddings</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="doc-toc lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">CONTENTS</p>
          <nav className="mt-4 space-y-2 text-sm">
            <a href="#scope" className="doc-toc-link">01 Product Scope</a>
            <a href="#architecture" className="doc-toc-link">02 Runtime Architecture</a>
            <a href="#ingestion" className="doc-toc-link">03 Ingestion Lifecycle</a>
            <a href="#retrieval" className="doc-toc-link">04 Retrieval and Response</a>
            <a href="#cost" className="doc-toc-link">05 Cost and Embeddings</a>
            <a href="#ops" className="doc-toc-link">06 Production Operations</a>
            <a href="#changes" className="doc-toc-link">07 Recent Milestone</a>
          </nav>
        </aside>

        <article className="doc-surface space-y-8 p-6 sm:p-8">
          <section className="doc-intro">
            <h1>PDF Workspace Technical Documentation</h1>
            <p>
              This document describes the actual production architecture, ingestion lifecycle, retrieval behavior,
              and cost strategy. It is written for engineering teams who need implementation clarity, not marketing copy.
            </p>
          </section>

          <section id="scope" className="doc-section">
            <h2>01. Product Scope</h2>
            <p>
              The product goal is simple: upload PDFs, index them in the background, and chat with grounded context
              from a selected document. The UI is designed for operational use, not one-time demos.
            </p>
            <div className="doc-grid-cards mt-4">
              <div className="doc-card">
                <FileText className="h-4 w-4" />
                <h3>Document-Centric Retrieval</h3>
                <p>Queries are filtered by documentId so answers remain scoped and auditable.</p>
              </div>
              <div className="doc-card">
                <Server className="h-4 w-4" />
                <h3>Background Processing</h3>
                <p>Queue-based ingestion prevents API latency spikes during PDF parsing and embedding.</p>
              </div>
              <div className="doc-card">
                <Blocks className="h-4 w-4" />
                <h3>Evidence Visibility</h3>
                <p>Top chunks and similarity context are exposed in the interface for trust.</p>
              </div>
            </div>
          </section>

          <section id="architecture" className="doc-section">
            <h2>02. Runtime Architecture</h2>
            <p>System responsibilities are separated cleanly across frontend, API, worker, and infra services.</p>
            <div className="doc-spec mt-4">
              <p><strong>Frontend (Next.js)</strong>: upload, document states, chat streaming, source rendering.</p>
              <p><strong>API (Express)</strong>: request validation, document endpoints, retrieval orchestration.</p>
              <p><strong>Worker (BullMQ)</strong>: extraction, chunking, embeddings, Qdrant upsert jobs.</p>
              <p><strong>Redis</strong>: queue transport and job lifecycle handling.</p>
              <p><strong>Qdrant</strong>: vector storage and filtered nearest-neighbor search.</p>
            </div>
          </section>

          <section id="ingestion" className="doc-section">
            <h2>03. Ingestion Lifecycle</h2>
            <p>Each PDF passes through strict state transitions to make operations visible and debuggable.</p>
            <ol>
              <li>Upload accepted and persisted with status <strong>queued</strong>.</li>
              <li>Worker claims the job and marks status <strong>processing</strong>.</li>
              <li>PDF text extraction and normalization run.</li>
              <li>Text is chunked into retrieval windows.</li>
              <li>Gemini embeddings are generated per chunk.</li>
              <li>Vectors are upserted to Qdrant with document payload metadata.</li>
              <li>Status is finalized as <strong>ready</strong> or <strong>failed</strong> with reason.</li>
            </ol>
          </section>

          <section id="retrieval" className="doc-section">
            <h2>04. Retrieval and Response Flow</h2>
            <ol>
              <li>User selects a ready document.</li>
              <li>Question is converted to an embedding vector.</li>
              <li>Qdrant search runs with documentId filter and Top-K limit.</li>
              <li>Retrieved chunks are assembled into context.</li>
              <li>Model response is generated from retrieved evidence.</li>
              <li>Frontend streams answer tokens and source snippets.</li>
            </ol>
          </section>

          <section id="cost" className="doc-section">
            <h2>05. Cost Strategy: Why Gemini Embeddings</h2>
            <p>
              We intentionally avoid expensive managed embedding pipelines for core indexing because costs can scale fast
              when teams re-index often or run frequent search/chat workloads.
            </p>
            <div className="doc-note mt-4">
              <CircleDollarSign className="h-4 w-4" />
              <p>
                This project uses our own ingestion logic with Gemini embeddings and Qdrant storage. We control
                chunking, scheduling, and indexing behavior directly instead of paying for a fully managed embedding
                workflow we do not need.
              </p>
            </div>
            <p className="mt-4">
              Important: this is not a &quot;no vectors&quot; system. We still rely on vector search for retrieval quality. The
              optimization is ownership and cost control over embedding generation.
            </p>
          </section>

          <section id="ops" className="doc-section">
            <h2>06. Production Operations</h2>
            <ol>
              <li>Keep Redis and Qdrant internal to private network boundaries.</li>
              <li>Store API keys in secret manager, never plaintext in images.</li>
              <li>Track queue depth, processing latency, and failure reasons.</li>
              <li>Add cleanup and retention jobs for temporary artifacts.</li>
            </ol>
          </section>

          <section id="changes" className="doc-section doc-endcap">
            <h2>07. Recent Milestone</h2>
            <p>
              Worker runtime was restructured to separate concerns and improve operational stability:
            </p>
            <pre className="doc-code">
Refactor worker.js to use new worker-app structure; removed PDF processing logic and integrated environment assertions and logging.
            </pre>
          </section>
        </article>
      </div>
    </main>
  );
}
