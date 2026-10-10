import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../config/env.js";

let qdrant;

function getClient() {
  if (!qdrant) {
    qdrant = new QdrantClient({ url: env.qdrantUrl });
  }
  return qdrant;
}

export async function ensureCollection(vectorSize) {
  const client = getClient();

  try {
    await client.getCollection(env.qdrantCollection);
  } catch (error) {
    await client.createCollection(env.qdrantCollection, {
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    });
    await client.createPayloadIndex(env.qdrantCollection, {
      field_name: "documentId",
      field_schema: "keyword",
    });
  }
}

export async function upsertDocumentChunks(points) {
  return getClient().upsert(env.qdrantCollection, {
    wait: true,
    points,
  });
}

export async function searchDocumentChunks({ vector, documentId, limit }) {
  return getClient().search(env.qdrantCollection, {
    vector,
    limit,
    with_payload: true,
    filter: {
      must: [
        {
          key: "documentId",
          match: {
            value: documentId,
          },
        },
      ],
    },
  });
}

export async function deleteDocumentChunks(documentId) {
  try {
    return await getClient().delete(env.qdrantCollection, {
      wait: true,
      filter: {
        must: [
          {
            key: "documentId",
            match: {
              value: documentId,
            },
          },
        ],
      },
    });
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}
