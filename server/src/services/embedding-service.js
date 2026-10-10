import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

let client;
const EMBEDDING_BATCH_SIZE = 32;

function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.googleApiKey });
  }
  return client;
}

export async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new AppError("Embedding input must be a non-empty string array", 400);
  }

  const allEmbeddings = [];

  for (let index = 0; index < texts.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBEDDING_BATCH_SIZE).map((text) => String(text));
    const response = await getClient().models.embedContent({
      model: env.embeddingModel,
      contents: batch,
    });

    allEmbeddings.push(...response.embeddings.map((embedding) => embedding.values));
  }

  return allEmbeddings;
}
