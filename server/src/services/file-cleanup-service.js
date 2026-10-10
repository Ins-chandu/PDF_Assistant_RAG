import fs from "node:fs/promises";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export async function cleanupOrphanedUploads(documentRepository) {
  const documents = await documentRepository.list();
  const activeFiles = new Set(documents.map((document) => document.storedFilename));
  const entries = await fs.readdir(env.uploadsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (activeFiles.has(entry.name)) {
      continue;
    }

    const filePath = `${env.uploadsDir}/${entry.name}`;
    const stats = await fs.stat(filePath);
    const maxAgeMs = env.cleanupMaxAgeHours * 60 * 60 * 1000;
    if (Date.now() - stats.mtimeMs <= maxAgeMs) {
      continue;
    }

    await fs.unlink(filePath);
    logger.info("Deleted orphaned upload", { filePath });
  }
}
