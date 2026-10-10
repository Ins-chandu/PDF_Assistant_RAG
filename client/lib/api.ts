import { ChatMessage, DocumentRecord } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function humanizeFetchError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const text = error.message.toLowerCase();
    if (text.includes("failed to fetch") || text.includes("networkerror") || text.includes("econnrefused")) {
      return "Cannot connect to the backend server. Please ensure API is running.";
    }
    return error.message;
  }

  return fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

export async function listDocuments() {
  try {
    const response = await fetch(`${API_BASE}/api/documents`, {
      cache: "no-store",
    });
    return parseJson<{ documents: DocumentRecord[] }>(response);
  } catch (error) {
    throw new Error(humanizeFetchError(error, "Unable to load documents"));
  }
}

export async function uploadDocuments(files: File[]) {
  if (files.length === 0) {
    throw new Error("Please choose at least one PDF");
  }

  if (files.length > 10) {
    throw new Error("You can upload up to 10 PDFs at a time");
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append("pdfs", file);
  }

  try {
    const response = await fetch(`${API_BASE}/api/documents/upload`, {
      method: "POST",
      body: formData,
    });

    return parseJson<{ documents: DocumentRecord[]; document?: DocumentRecord; message: string }>(response);
  } catch (error) {
    throw new Error(humanizeFetchError(error, "Upload failed"));
  }
}

export async function uploadDocument(file: File) {
  const payload = await uploadDocuments([file]);
  return {
    message: payload.message,
    document: payload.document || payload.documents[0],
  };
}

export async function deleteDocument(documentId: string) {
  try {
    const response = await fetch(`${API_BASE}/api/documents/${documentId}`, {
      method: "DELETE",
    });

    return parseJson<{ message: string; documentId: string }>(response);
  } catch (error) {
    throw new Error(humanizeFetchError(error, "Unable to delete document"));
  }
}

export async function streamChat(params: {
  documentId: string;
  query: string;
  topK: number;
  history: Array<Pick<ChatMessage, "role" | "content">>;
  onToken: (token: string) => void;
  onDone: (payload: { answer: string; sources: ChatMessage["sources"] }) => void;
}) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentId: params.documentId,
        query: params.query,
        topK: params.topK,
        history: params.history,
      }),
    });
  } catch (error) {
    throw new Error(humanizeFetchError(error, "Unable to start the chat stream"));
  }

  if (!response.ok || !response.body) {
    let message = "Unable to start the chat stream";
    try {
      const errorPayload = await response.json();
      message = errorPayload.error || message;
    } catch {}
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((candidate) => candidate.startsWith("data: "));

      if (!line) {
        continue;
      }

      const payload = JSON.parse(line.slice(6));
      if (payload.type === "token") {
        params.onToken(payload.content);
      }
      if (payload.type === "done") {
        params.onDone({
          answer: payload.answer,
          sources: payload.sources || [],
        });
      }
      if (payload.type === "error") {
        throw new Error(payload.error || "Streaming failed");
      }
    }
  }
}
