export type DocumentStatus = "queued" | "processing" | "ready" | "failed";

export interface DocumentRecord {
  id: string;
  originalName: string;
  storedFilename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  chunkCount: number;
  summary: string;
  errorMessage: string;
}

export interface ChatSource {
  chunkIndex: number;
  text: string;
  score: number;
  documentName: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: ChatSource[];
}
