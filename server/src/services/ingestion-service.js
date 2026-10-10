import { PDFParse } from "pdf-parse";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { DOCUMENT_STATUS } from "../constants/documents.js";
import { AppError } from "../lib/errors.js";
import { embedTexts } from "./embedding-service.js";
import { deleteDocumentChunks, ensureCollection, upsertDocumentChunks } from "./qdrant-service.js";
import { sanitizeText, summarizeSnippet } from "../utils/documents.js";

export class IngestionService {
  constructor({ documentRepository, documentService }) {
    this.documentRepository = documentRepository;
    this.documentService = documentService;
  }

  async ingest(documentId) {
    const document = await this.documentRepository.getById(documentId);
    if (!document) {
      throw new AppError("Document not found for ingestion", 404);
    }

    await this.documentService.updateDocumentStatus(documentId, {
      status: DOCUMENT_STATUS.PROCESSING,
      errorMessage: "",
    });

    const fileBuffer = await readFile(document.storagePath);
    const parser = new PDFParse({ data: fileBuffer });
    const parsedPdf = await parser.getText();
    // `destroy` is not available in every pdf-parse release.
    if (typeof parser.destroy === "function") {
      await parser.destroy();
    }
    const normalizedText = sanitizeText(parsedPdf.text);

    if (!normalizedText) {
      throw new AppError("No readable text found in the PDF", 400);
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1200,
      chunkOverlap: 180,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });

    const chunks = await splitter.splitText(normalizedText);
    const embeddings = await embedTexts(chunks);

    await ensureCollection(embeddings[0].length);
    await deleteDocumentChunks(documentId);

    const points = embeddings.map((vector, index) => ({
      id: randomUUID(),
      vector,
      payload: {
        documentId,
        documentName: document.originalName,
        chunkIndex: index,
        text: chunks[index],
        snippet: summarizeSnippet(chunks[index], 260),
      },
    }));

    await upsertDocumentChunks(points);

    await this.documentService.markDocumentReady(documentId, {
      chunkCount: chunks.length,
      summary: chunks.slice(0, 2).join(" "),
    });

    return {
      documentId,
      chunkCount: chunks.length,
    };
  }
}
