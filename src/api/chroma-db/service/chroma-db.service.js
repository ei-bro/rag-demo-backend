import { ChromaClient } from 'chromadb';
import { chunkText } from '../../../utils/chunk.js';
import {
  generateAnswer,
  getDocumentEmbedding,
  getQueryEmbedding,
} from '../../../utils/gemini.js';

// Collection (similar to a table) inside the Chroma server
const collectionName = process.env.CHROMA_COLLECTION || 'evangadi-handbook';

// How many top matching chunks to feed to the model as context
const TOP_K = 3;

// Cache the client; ChromaClient() defaults to the local server on :8000
let chromaClient;

const getChromaClient = () => {
  if (!chromaClient) {
    chromaClient = new ChromaClient();
  }
  return chromaClient;
};

// Get the existing collection, but first confirm the Chroma server is reachable.
const getCollection = async () => {
  const chroma = getChromaClient();

  try {
    // heartbeat() throws if the server isn't running
    await chroma.heartbeat();
  } catch {
    const error = new Error(
      'Chroma server is not running. Start it with: npx chroma run --path ./chroma-data',
    );
    error.statusCode = 503;
    throw error;
  }

  // embeddingFunction: null -> we supply our own embeddings (from Gemini),
  // so Chroma should not try to embed text itself.
  return chroma.getCollection({
    name: collectionName,
    embeddingFunction: null,
  });
};

/**
 * Ingest: (re)create the collection and add each chunk with its embedding.
 * @param {string} text
 */
export const ingestChromaService = async text => {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    const error = new Error('No text chunks found in the uploaded file.');
    error.statusCode = 400;
    throw error;
  }

  const chroma = getChromaClient();

  try {
    await chroma.heartbeat();
  } catch {
    const error = new Error(
      'Chroma server is not running. Start it with: npx chroma run --path ./chroma-data',
    );
    error.statusCode = 503;
    throw error;
  }

  // Start fresh each upload: drop the old collection if it exists
  try {
    await chroma.deleteCollection({ name: collectionName });
  } catch {
    // Collection may not exist on first run
  }

  // Use cosine distance for similarity (matches our embedding model's space)
  const collection = await chroma.createCollection({
    name: collectionName,
    metadata: { 'hnsw:space': 'cosine' },
    embeddingFunction: null,
  });

  // Chroma's add() expects parallel arrays: ids[i], embeddings[i], documents[i]
  const ids = [];
  const embeddings = [];
  const documents = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getDocumentEmbedding(chunk);
    ids.push(`chunk-${i}`);
    embeddings.push(embedding);
    documents.push(chunk);
  }

  await collection.add({ ids, embeddings, documents });

  return {
    chunkCount: chunks.length,
    store: 'chroma-db',
    collection: collectionName,
  };
};

/**
 * Query: ask Chroma for the nearest document, convert distance to a score,
 * then generate an answer from it.
 * @param {string} question
 */
export const queryChromaService = async question => {
  const collection = await getCollection();
  const count = await collection.count();

  if (count === 0) {
    const error = new Error(
      'No documents indexed yet. POST a .txt file to /api/chroma-db first.',
    );
    error.statusCode = 404;
    throw error;
  }

  const questionEmbedding = await getQueryEmbedding(question);

  // nResults: TOP_K -> nearest docs; include -> return the text and distances
  const results = await collection.query({
    queryEmbeddings: [questionEmbedding],
    nResults: TOP_K,
    include: ['documents', 'distances'],
  });

  // Results are nested per query embedding; we sent one, so use index [0]
  const bestMatches = (results.documents?.[0] ?? []).filter(Boolean);
  const distances = results.distances?.[0] ?? [];
  // Cosine distance is 0 (identical) to 2; similarity score = 1 - distance
  const score = 1 - (distances[0] ?? 1); // score of the closest chunk

  // Feed all the top chunks to the model as context (array param)
  const answer = await generateAnswer({ question, context: bestMatches });

  return {
    question,
    bestMatches,
    score: Number(score.toFixed(4)),
    answer,
    store: 'chroma-db',
    collection: collectionName,
  };
};
