import { Router } from "express";
import { AppError } from "../lib/errors.js";

export function createChatRouter({ chatService }) {
  const router = Router();

  router.post("/", async (req, res) => {
    const { documentId, query, topK, history } = req.body || {};
    if (!documentId || !query) {
      throw new AppError("documentId and query are required", 400);
    }

    const response = await chatService.generateAnswer({
      documentId,
      query,
      topK,
      history: Array.isArray(history) ? history : [],
    });

    res.json(response);
  });

  router.post("/stream", async (req, res) => {
    const { documentId, query, topK, history } = req.body || {};
    if (!documentId || !query) {
      throw new AppError("documentId and query are required", 400);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      await chatService.streamAnswer({
        documentId,
        query,
        topK,
        history: Array.isArray(history) ? history : [],
        onToken(content) {
          res.write(`data: ${JSON.stringify({ type: "token", content })}\n\n`);
        },
        onComplete(payload) {
          res.write(`data: ${JSON.stringify({ type: "done", ...payload })}\n\n`);
          res.end();
        },
      });
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          error: error.message || "Failed to stream response",
        })}\n\n`
      );
      res.end();
    }
  });

  return router;
}
