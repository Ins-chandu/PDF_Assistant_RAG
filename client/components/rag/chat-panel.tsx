"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Check, Copy, Loader2, Send, Trash2, User } from "lucide-react";
import { streamChat } from "../../lib/api";
import { ChatMessage, DocumentRecord } from "../../lib/types";
import { Toast } from "./toast";

interface ChatPanelProps {
  document: DocumentRecord | null;
  topK: number;
}

const starterPrompts = [
  "Give me an executive summary of this document.",
  "What are the most important facts or requirements?",
  "List key deadlines, risks, or obligations mentioned here.",
];

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function ChatPanel({ document, topK }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  function clearConversation() {
    setMessages([]);
    setStreamingContent("");
    setError("");
  }

  async function copyToClipboard(messageId: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      window.setTimeout(() => setCopiedMessageId((current) => (current === messageId ? null : current)), 1200);
    } catch {
      setError("Clipboard permission blocked by browser");
    }
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer = window.setTimeout(() => setError(""), 4200);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    setMessages([]);
    setStreamingContent("");
    setInput("");
    setError("");
  }, [document?.id]);

  async function submitMessage(nextInput?: string) {
    const query = (nextInput ?? input).trim();
    if (!document || !query || document.status !== "ready" || isStreaming) {
      return;
    }

    const userMessage = createMessage("user", query);
    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setStreamingContent("");
    setError("");
    setIsStreaming(true);

    try {
      await streamChat({
        documentId: document.id,
        query,
        topK,
        history,
        onToken(token) {
          setStreamingContent((current) => current + token);
        },
        onDone(payload) {
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: payload.answer,
              createdAt: new Date().toISOString(),
              sources: payload.sources,
            },
          ]);
          setStreamingContent("");
        },
      });
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "Chat failed");
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submitMessage();
  }

  return (
    <section className="panel-surface relative flex h-full min-h-0 flex-col">
      <div className="pointer-events-none absolute right-4 top-4 z-20 w-[min(90%,360px)]">
        {error ? <Toast kind="error" message={error} onClose={() => setError("")} /> : null}
      </div>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="eyebrow">Answering</p>
          <h2 className="text-2xl font-semibold text-slate-950">
            {document ? document.originalName : "Select a document"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {document
              ? document.status === "ready"
                ? "Streaming answers grounded in the selected document."
                : "This document is still indexing. Chat unlocks once ingestion finishes."
              : "Pick a ready document from the library to start grounded chat."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearConversation}
            disabled={messages.length === 0 && !streamingContent}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {document?.status || "idle"}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.length === 0 && !streamingContent ? (
          <div className="grid h-full place-items-center rounded-[32px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="max-w-xl">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white">
                <Bot className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-950">Build answers from retrieval, not guesswork</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Upload a PDF, wait for indexing, then ask for summaries, obligations, facts, or evidence-backed
                answers. Every response includes source snippets from the retrieved chunks.
              </p>
              {document?.status === "ready" ? (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitMessage(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" ? (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                <Bot className="h-4 w-4" />
              </div>
            ) : null}
            <div className={`max-w-3xl ${message.role === "user" ? "order-first" : ""}`}>
              <div
                className={`rounded-[28px] px-5 py-4 text-sm leading-7 ${
                  message.role === "assistant"
                    ? "border border-slate-200 bg-white text-slate-800"
                    : "bg-slate-950 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1">
                <span className="text-xs text-slate-400">{formatTime(message.createdAt)}</span>
                {message.role === "assistant" ? (
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(message.id, message.content)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300"
                  >
                    {copiedMessageId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedMessageId === message.id ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
              {message.sources?.length ? (
                <div className="mt-3 grid gap-3">
                  {message.sources.map((source) => (
                    <details
                      key={`${message.id}-${source.chunkIndex}`}
                      className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Chunk {source.chunkIndex}</p>
                          <p className="text-xs text-slate-500">{source.documentName}</p>
                        </div>
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-medium text-cyan-700">
                          {(source.score * 100).toFixed(0)}% match
                        </span>
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {source.text}
                      </p>
                    </details>
                  ))}
                </div>
              ) : null}
            </div>
            {message.role === "user" ? (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-white">
                <User className="h-4 w-4" />
              </div>
            ) : null}
          </article>
        ))}

        {streamingContent ? (
          <article className="flex items-start gap-3">
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-3xl rounded-[28px] border border-slate-200 bg-white px-5 py-4 text-sm leading-7 text-slate-800">
              <p className="inline whitespace-pre-wrap break-words">{streamingContent}</p>
              <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-full bg-cyan-500" />
            </div>
          </article>
        ) : null}

        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 pt-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            disabled={!document || document.status !== "ready" || isStreaming}
            placeholder={
              !document
                ? "Select a document to start."
                : document.status !== "ready"
                  ? "Wait for ingestion to finish before chatting."
                  : "Ask a grounded question about this document..."
            }
            className="min-h-28 rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitMessage();
              }
            }}
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Responses are constrained to retrieved evidence from the selected PDF. Press Enter to send, Shift+Enter
              for a new line.
            </p>
            <button
              type="submit"
              disabled={!document || document.status !== "ready" || !input.trim() || isStreaming}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ask
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
