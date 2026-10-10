import { createApp } from "./src/app.js";
import { assertEnv, env } from "./src/config/env.js";
import { logger } from "./src/lib/logger.js";

assertEnv();

const app = createApp();

app.listen(env.port, () => {
  logger.info("API server started", {
    port: env.port,
    environment: env.nodeEnv,
  });
});
