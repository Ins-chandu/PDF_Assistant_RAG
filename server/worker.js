import { assertEnv } from "./src/config/env.js";
import { logger } from "./src/lib/logger.js";
import { startWorker } from "./src/worker-app.js";

assertEnv();
startWorker();
logger.info("Worker started");
