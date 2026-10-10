import { Router } from "express";
import { env } from "../config/env.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json({
      status: "ok",
      service: "pdf-rag-api",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
