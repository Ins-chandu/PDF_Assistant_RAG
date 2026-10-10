import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { DOCUMENT_STATUS } from "../constants/documents.js";
import { AppError } from "../lib/errors.js";
import { ingestionQueue } from "../queues/ingestion-queue.js";
import { summarizeSnippet } from "../utils/documents.js";

export class DocumentService {
  constructor({ documentRepository }) {
    this.documentRepository = documentRepository;
  }

  async listDocuments() {
    return this.documentRepository.list();
  }

  async getDocument(documentId) {
    const document = await this.documentRepository.getById(documentId);
    if (!document) {
      throw new AppError("Document not found", 404);
    }
    return document;
  }

  async createDocumentRecord(file) {
    const now = new Date().toISOString();
    const storedFilename = `${Date.now()}-${randomUUID()}${path.extname(file.originalname) || ".pdf"}`;
    const destinationPath = path.join(env.uploadsDir, storedFilename);
    await fs.rename(file.path, destinationPath);

    const document = await this.documentRepository.create({
      id: randomUUID(),
      originalName: file.originalname,
      storedFilename,
      storagePath: destinationPath,
      mimeType: file.mimetype,
      size: file.size,
      status: DOCUMENT_STATUS.QUEUED,
      createdAt: now,
      updatedAt: now,
      chunkCount: 0,
      summary: "",
      errorMessage: "",
    });

    await ingestionQueue.add(
      "ingest-document",
      {
        documentId: document.id,
      },
      {
        removeOnComplete: 50,
        removeOnFail: 100,
      }
    );

    return document;
  }

  async createDocumentRecords(files) {
    const created = [];
    for (const file of files) {
      // Keep creation deterministic and easier to reason about for request-level failures.
      created.push(await this.createDocumentRecord(file));
    }
    return created;
  }

  async updateDocumentStatus(documentId, patch) {
    const updated = await this.documentRepository.update(documentId, (document) => ({
      ...document,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));

    if (!updated) {
      throw new AppError("Document not found", 404);
    }

    return updated;
  }

  async markDocumentReady(documentId, { chunkCount, summary }) {
    return this.updateDocumentStatus(documentId, {
      status: DOCUMENT_STATUS.READY,
      chunkCount,
      summary: summarizeSnippet(summary, 320),
      errorMessage: "",
    });
  }

  async markDocumentFailed(documentId, errorMessage) {
    return this.updateDocumentStatus(documentId, {
      status: DOCUMENT_STATUS.FAILED,
      errorMessage,
    });
  }

  async deleteDocument(documentId) {
    const document = await this.getDocument(documentId);
    await this.documentRepository.remove(documentId);

    try {
      await fs.unlink(document.storagePath);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }

    return document;
  }
}
