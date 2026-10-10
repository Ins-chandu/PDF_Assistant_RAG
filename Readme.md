# PDF RAG Workspace

A production-style Retrieval-Augmented Generation workspace for PDF documents.

This project lets users upload PDFs, index them asynchronously, and ask grounded questions with source-backed answers.
It is designed for practical use, not just demo behavior.

## Why This Project Exists

Many PDF chat apps look good in a demo but fail in day-to-day use because they mix ingestion and chat in one request path,
lack clear document states, and hide retrieval evidence.

This workspace fixes those issues by separating ingestion from chat, exposing operational states, and keeping retrieval
document-scoped and inspectable.

## Product Scope

- Multi-PDF upload and indexing
- Explicit status lifecycle: queued, processing, ready, failed
- Document-level retrieval filtering
- Streaming chat responses
- Source snippets and similarity evidence
- Top-K retrieval control for precision and recall tuning

## Architecture

The system is split into five moving parts:

1. Frontend (Next.js)
2. API (Express)
3. Worker (BullMQ)
4. Redis (queue transport)
5. Qdrant (vector storage and nearest-neighbor search)

### Monorepo Structure

```text
client/
  app/
  components/rag/
  lib/

server/
  src/
    config/
    constants/
    lib/
    middleware/
    queues/
    repositories/
    routes/
    services/
    utils/
  storage/

docker-compose.yml
pnpm-workspace.yaml
```

## End-to-End Data Flow

### 1. Upload and Queue

1. User uploads one or more PDFs.
2. API stores file metadata and marks each document as queued.
3. Ingestion jobs are pushed into BullMQ.

### 2. Background Ingestion

1. Worker consumes queued jobs.
2. PDF text is extracted and normalized.
3. Content is chunked into retrieval windows.
4. Embeddings are generated for each chunk.
5. Vectors are upserted into Qdrant with payload fields including documentId.
6. Document status transitions to ready or failed.

### 3. Grounded Chat

1. User selects one ready document.
2. User query is embedded.
3. Qdrant search returns top matching chunks, filtered by selected documentId.
4. Retrieved chunks are assembled as grounding context.
5. LLM response is streamed back to the UI.
6. UI shows answer plus source context and score metadata.

## Embedding Strategy: Why Gemini Instead of Paid Managed Vector Pipelines

This project intentionally uses Gemini embeddings in our own ingestion flow.

Reasoning:

1. Cost control: fully managed premium embedding pipelines can become expensive with frequent re-indexing and high query volume.
2. Operational control: we choose when embeddings are generated, how chunking works, and how vectors are stored.
3. Flexibility: swapping chunking policy, metadata schema, and retrieval filters remains straightforward.

Important clarification:

- We still use a vector database (Qdrant) for similarity search.
- The cost optimization is about embedding-generation workflow and platform dependence, not removing vector search itself.

In short: bring-your-own-embedding with Gemini + self-managed Qdrant indexing.

## API Surface

### Health

- GET /api/health

### Documents

- GET /api/documents
- GET /api/documents/:documentId
- POST /api/documents/upload
- DELETE /api/documents/:documentId

### Chat

- POST /api/chat
- POST /api/chat/stream

Sample chat request:

```json
{
  "documentId": "uuid",
  "query": "Summarize the obligations in section 4",
  "topK": 6,
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

## Local Development

### 1. Configure environment

```bash
cp .env.example .env
cp server/.env.sample server/.env
```

Required keys:

- GOOGLE_API_KEY
- GROQ_API_KEY

### 2. Start infra services

```bash
docker compose up -d redis qdrant
```

### 3. Start backend and worker

```bash
cd server
pnpm install
pnpm dev
```

In a second terminal:

```bash
cd server
pnpm dev:worker
```

### 4. Start frontend

```bash
cd client
pnpm install
pnpm dev
```

Defaults:

- Frontend: http://localhost:3000
- API: http://localhost:4000

## Docker Deployment

### 1. Configure root environment

```bash
cp .env.example .env
```

Set values for:

- GOOGLE_API_KEY
- GROQ_API_KEY
- FRONTEND_PORT (optional)
- API_PORT (optional)
- NEXT_PUBLIC_API_URL (optional)
- CORS_ORIGIN (optional)

### 2. Build and run the stack

```bash
docker compose up --build
```

Services:

- frontend
- api
- worker
- redis (internal)
- qdrant (internal)

## Production Hardening Checklist

- Move secrets to secure secret manager
- Add request tracing and structured logs for API + worker
- Add queue depth and job-latency dashboards
- Add retry policy for transient embedding and network failures
- Add role-based access if exposed to multiple users
- Add backup strategy for metadata and vector collections

## Verification Commands

- node --check server/index.js
- node --check server/worker.js
- pnpm exec tsc --noEmit (inside client)
- pnpm build (root or client)
