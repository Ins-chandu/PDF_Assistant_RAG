import { Queue } from "bullmq";
import { env } from "../config/env.js";
import { INGESTION_QUEUE } from "../constants/documents.js";

export const ingestionQueue = new Queue(INGESTION_QUEUE, {
  connection: {
    host: env.redisHost,
    port: env.redisPort,
  },
});
