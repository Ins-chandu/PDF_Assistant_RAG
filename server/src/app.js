import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { ensureDir } from "./lib/fs.js";
import { errorHandler } from "./middleware/error-handler.js";
import { DocumentRepository } from "./repositories/document-repository.js";
import { createChatRouter } from "./routes/chat-routes.js";
import { createDocumentRouter } from "./routes/document-routes.js";
import { createHealthRouter } from "./routes/health-routes.js";
import { ChatService } from "./services/chat-service.js";
import { cleanupOrphanedUploads } from "./services/file-cleanup-service.js";
import { DocumentService } from "./services/document-service.js";
import { deleteDocumentChunks } from "./services/qdrant-service.js";

ensureDir(env.storageDir);
ensureDir(env.uploadsDir);

const documentRepository = new DocumentRepository(env.metadataFile);
const documentService = new DocumentService({ documentRepository });
const chatService = new ChatService({ documentRepository });

export const services = {
  documentRepository,
  documentService,
  chatService,
};

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    })
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (req, res) => {
    res.json({
      name: "pdf-rag-api",
      version: "2.0.0",
      docs: {
        health: "/api/health",
        documents: "/api/documents",
        chat: "/api/chat",
      },
    });
  });

  app.use("/api/health", createHealthRouter());
  app.use(
    "/api/documents",
    createDocumentRouter({
      documentService,
      qdrantDelete: deleteDocumentChunks,
    })
  );
  app.use(
    "/api/chat",
    createChatRouter({
      chatService,
    })
  );

  app.use(errorHandler);

  cleanupOrphanedUploads(documentRepository).catch(() => undefined);
  setInterval(() => {
    cleanupOrphanedUploads(documentRepository).catch(() => undefined);
  }, 60 * 60 * 1000);

  return app;
}
