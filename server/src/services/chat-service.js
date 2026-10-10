import { Groq } from "groq-sdk";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";
import { embedTexts } from "./embedding-service.js";
import { searchDocumentChunks } from "./qdrant-service.js";

const groq = new Groq({ apiKey: env.groqApiKey });

function buildMessages({ contextBlocks, question, history }) {
  return [
    {
      role: "system",
      content: [
        "You are a grounded RAG assistant.",
        "Answer only from the supplied document context.",
        "If the answer is missing or weakly supported, say you cannot find it in the uploaded document.",
        "Cite evidence naturally and keep the response precise.",
        "",
        "Document context:",
        contextBlocks.join("\n\n"),
      ].join("\n"),
    },
    ...history,
    {
      role: "user",
      content: question,
    },
  ];
}

function mapSources(results) {
  return results.map((result) => ({
    chunkIndex: result.payload.chunkIndex,
    text: result.payload.snippet,
    score: result.score,
    documentName: result.payload.documentName,
  }));
}

export class ChatService {
  constructor({ documentRepository }) {
    this.documentRepository = documentRepository;
  }

  async retrieve({ documentId, query, topK }) {
    const document = await this.documentRepository.getById(documentId);
    if (!document) {
      throw new AppError("Document not found", 404);
    }

    if (document.status !== "ready") {
      throw new AppError("Document is not ready for chat yet", 409);
    }

    const [vector] = await embedTexts([query]);
    const rawResults = await searchDocumentChunks({
      vector,
      documentId,
      limit: Math.min(Math.max(Number(topK) || env.retrievalLimit, 3), 12),
    });

    const results = rawResults.filter((result) => result.score >= env.retrievalScoreThreshold);
    return {
      document,
      results,
      contextBlocks: results.map(
        (result, index) =>
          `[Source ${index + 1} | chunk ${result.payload.chunkIndex}] ${result.payload.text}`
      ),
      sources: mapSources(results),
    };
  }

  async generateAnswer({ documentId, query, topK, history = [] }) {
    const retrieval = await this.retrieve({ documentId, query, topK });

    if (retrieval.results.length === 0) {
      return {
        answer: "I could not find enough evidence in this document to answer that confidently.",
        sources: [],
        document: retrieval.document,
      };
    }

    const completion = await groq.chat.completions.create({
      model: env.groqModel,
      temperature: 0.2,
      max_tokens: 900,
      messages: buildMessages({
        contextBlocks: retrieval.contextBlocks,
        question: query,
        history,
      }),
    });

    return {
      answer: completion.choices[0]?.message?.content || "",
      sources: retrieval.sources,
      document: retrieval.document,
    };
  }

  async streamAnswer({ documentId, query, topK, history = [], onToken, onComplete }) {
    const retrieval = await this.retrieve({ documentId, query, topK });

    if (retrieval.results.length === 0) {
      onComplete({
        answer: "I could not find enough evidence in this document to answer that confidently.",
        sources: [],
        document: retrieval.document,
      });
      return;
    }

    const stream = await groq.chat.completions.create({
      model: env.groqModel,
      temperature: 0.2,
      max_tokens: 900,
      stream: true,
      messages: buildMessages({
        contextBlocks: retrieval.contextBlocks,
        question: query,
        history,
      }),
    });

    let answer = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (!content) {
        continue;
      }
      answer += content;
      onToken(content);
    }

    onComplete({
      answer,
      sources: retrieval.sources,
      document: retrieval.document,
    });
  }
}
