import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

export function createDocumentRouter({ documentService, qdrantDelete }) {
  const router = Router();
  const maxUploadFiles = 10;

  const upload = multer({
    dest: env.uploadsDir,
    limits: {
      fileSize: env.maxFileSizeMb * 1024 * 1024,
      files: maxUploadFiles,
    },
    fileFilter: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      if (file.mimetype === "application/pdf" || extension === ".pdf") {
        callback(null, true);
        return;
      }

      callback(new AppError("Only PDF files are supported", 400));
    },
  });

  router.get("/", async (req, res) => {
    const documents = await documentService.listDocuments();
    res.json({ documents });
  });

  router.get("/:documentId", async (req, res) => {
    const document = await documentService.getDocument(req.params.documentId);
    res.json({ document });
  });

  router.post(
    "/upload",
    upload.fields([
      { name: "pdf", maxCount: 1 },
      { name: "pdfs", maxCount: maxUploadFiles },
    ]),
    async (req, res) => {
      const uploadedFiles = [
        ...((req.files && req.files.pdf) || []),
        ...((req.files && req.files.pdfs) || []),
      ];

      if (uploadedFiles.length === 0) {
        throw new AppError("No PDF file was uploaded", 400);
      }

      if (uploadedFiles.length > maxUploadFiles) {
        throw new AppError(`Upload limit is ${maxUploadFiles} PDFs per request`, 400);
      }

      const documents = await documentService.createDocumentRecords(uploadedFiles);
      res.status(202).json({
        message: `${documents.length} document(s) accepted for ingestion`,
        documents,
        document: documents[0],
      });
    }
  );

  router.delete("/:documentId", async (req, res) => {
    const document = await documentService.deleteDocument(req.params.documentId);
    await qdrantDelete(document.id);
    res.json({
      message: "Document deleted",
      documentId: document.id,
    });
  });

  return router;
}
