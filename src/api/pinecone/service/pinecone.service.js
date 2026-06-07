import { Pinecone } from '@pinecone-database/pinecone';
import { chunkText } from '../../../utils/chunk.js';
import {
  generateAnswer,
  getDocumentEmbedding,
  getQueryEmbedding,
} from '../../../utils/gemini.js';

// Name of the Pinecone index to read/write (must already exist in Pinecone)
const indexName = process.env.PINECONE_INDEX || 'evangadi-handbook';

// How many top matching chunks to feed to the model as context
const TOP_K = 3;

// Cache the client across requests so we don't re-create it every call
let pineconeClient;

// Lazily build the client and return a handle to the target index.
const getIndex = () => {
  if (!process.env.PINECONE_API_KEY) {
    const error = new Error('PINECONE_API_KEY is not configured.');
    error.statusCode = 500;
    throw error;
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }

  return pineconeClient.index({ name: indexName });
};

/**
 * Ingest: embed each chunk and upsert it into Pinecone with the text in metadata.
 * @param {string} text
 */
export const ingestPineconeService = async text => {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    const error = new Error('No text chunks found in the uploaded file.');
    error.statusCode = 400;
    throw error;
  }

  const index = getIndex();
  const vectorsToUpsert = [];

  // Build the list of vectors; keep the original text in metadata so we can
  // read it back at query time without a separate lookup.
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getDocumentEmbedding(chunk);

    vectorsToUpsert.push({
      id: `chunk-${i}`,
      values: embedding,
      metadata: { text: chunk },
    });
  }

  // Upsert = insert new vectors or overwrite existing ones with the same id
  await index.upsert(vectorsToUpsert);

  return { chunkCount: chunks.length, store: 'pinecone', index: indexName };
};

/**
 * Query: let Pinecone find the single closest vector, then generate an answer.
 * @param {string} question
 */
export const queryPineconeService = async question => {
  const index = getIndex();
  const questionEmbedding = await getQueryEmbedding(question);

  // topK: TOP_K -> the closest matches; includeMetadata -> return stored text
  const results = await index.query({
    vector: questionEmbedding,
    topK: TOP_K,
    includeMetadata: true,
  });

  const matches = results.matches ?? [];
  // Pull the original text out of each match's metadata
  const bestMatches = matches
    .map(match => match?.metadata?.text)
    .filter(Boolean);

  if (bestMatches.length === 0) {
    const error = new Error(
      'No documents indexed yet. POST a .txt file to /api/pinecone first.',
    );
    error.statusCode = 404;
    throw error;
  }

  // Feed all the top chunks to the model as context (array param)
  const answer = await generateAnswer({ question, context: bestMatches });

  return {
    question,
    bestMatches,
    // Pinecone returns the similarity score directly (higher = closer)
    score: Number((matches[0].score ?? 0).toFixed(4)), // score of the closest chunk
    answer,
    store: 'pinecone',
    index: indexName,
  };
};
