import { embedTexts } from "./src/services/embedding-service.js";

export default async function embeddingModel({ docs }) {
  return embedTexts(docs);
}
