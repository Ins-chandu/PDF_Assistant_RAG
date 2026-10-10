import { Worker } from "bullmq";
import { env } from "./config/env.js";
import { INGESTION_QUEUE } from "./constants/documents.js";
import { logger } from "./lib/logger.js";
import { DocumentRepository } from "./repositories/document-repository.js";
import { DocumentService } from "./services/document-service.js";
import { IngestionService } from "./services/ingestion-service.js";

const documentRepository = new DocumentRepository(env.metadataFile);
const documentService = new DocumentService({ documentRepository });
const ingestionService = new IngestionService({
  documentRepository,
  documentService,
});

export function startWorker() {
  const worker = new Worker(
    INGESTION_QUEUE,
    async (job) => {
      await ingestionService.ingest(job.data.documentId);
    },
    {
      connection: {
        host: env.redisHost,
        port: env.redisPort,
      },
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    logger.info("Ingestion job completed", { jobId: job.id, documentId: job.data.documentId });
  });

  worker.on("failed", async (job, error) => {
    logger.error("Ingestion job failed", {
      jobId: job?.id,
      documentId: job?.data?.documentId,
      error: error.message,
    });

    if (job?.data?.documentId) {
      await documentService.markDocumentFailed(job.data.documentId, error.message);
    }
  });

  return worker;
}
