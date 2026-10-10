import { configDotenv } from "dotenv";
import path from "node:path";

configDotenv();

const rootDir = process.cwd();
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(rootDir, process.env.STORAGE_DIR)
  : path.join(rootDir, "storage");

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  storageDir,
  uploadsDir: path.join(storageDir, "uploads"),
  metadataFile: path.join(storageDir, "documents.json"),
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 25),
  redisHost: process.env.REDIS_HOST || "127.0.0.1",
  redisPort: Number(process.env.REDIS_PORT || 6379),
  qdrantUrl: process.env.QDRANT_URL || "http://127.0.0.1:6333",
  qdrantCollection: process.env.QDRANT_COLLECTION || "rag_documents",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  googleApiKey: process.env.GOOGLE_API_KEY || process.env.GoogleAPIKEY || "",
  embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-001",
  retrievalLimit: Number(process.env.RETRIEVAL_LIMIT || 6),
  retrievalScoreThreshold: Number(process.env.RETRIEVAL_SCORE_THRESHOLD || 0.2),
  cleanupMaxAgeHours: Number(process.env.UPLOAD_RETENTION_HOURS || 24),
};

export function assertEnv() {
  const missing = [];

  if (!env.googleApiKey) {
    missing.push("GOOGLE_API_KEY");
  }

  if (!env.groqApiKey) {
    missing.push("GROQ_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
