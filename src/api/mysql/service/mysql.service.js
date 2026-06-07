import { executeQuery } from '../../../../db/db.config.js';
import { chunkText } from '../../../utils/chunk.js';
import { cosineSimilarity } from '../../../utils/cosine.js';
import {
  generateAnswer,
  getDocumentEmbedding,
  getQueryEmbedding,
} from '../../../utils/gemini.js';

// How many top matching chunks to feed to the model as context
const TOP_K = 3;

// Create the table on demand so the demo works on a fresh database.
// The embedding is stored as a JSON array of numbers.
const ensureTable = async () => {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS handbook_pages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

/**
 * Ingest: split text into chunks, embed each one, and store it in MySQL.
 * @param {string} text
 * @returns {Promise<{chunkCount: number, store: string}>}
 */
export const ingestMysqlService = async text => {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    const error = new Error('No text chunks found in the uploaded file.');
    error.statusCode = 400;
    throw error;
  }

  await ensureTable();
  // Demo behavior: wipe previous data so each upload starts clean
  await executeQuery('TRUNCATE TABLE handbook_pages');

  // Embed and insert one chunk at a time
  for (const chunk of chunks) {
    const embedding = await getDocumentEmbedding(chunk);
    await executeQuery(
      'INSERT INTO handbook_pages (content, embedding) VALUES (?, ?)',
      [chunk, JSON.stringify(embedding)],
    );
  }

  return { chunkCount: chunks.length, store: 'mysql' };
};

/**
 * Query: find the most similar stored chunks and ask the model to answer.
 * MySQL has no vector search here, so we load all rows and compare in JS.
 * @param {string} question
 */
export const queryMysqlService = async question => {
  const rows = await executeQuery(
    'SELECT content, embedding FROM handbook_pages',
  );

  if (!rows.length) {
    const error = new Error(
      'No documents indexed yet. POST a .txt file to /api/mysql first.',
    );
    error.statusCode = 404;
    throw error;
  }

  // Embed the question so we can compare it against every stored chunk
  const questionEmbedding = await getQueryEmbedding(question);

  // Score every row by cosine similarity to the question
  const scored = rows.map(({ content, embedding }) => {
    const storedEmbedding =
      typeof embedding === 'string' ? JSON.parse(embedding) : embedding;

    return {
      content,
      score: cosineSimilarity(questionEmbedding, storedEmbedding),
    };
  });

  // Keep the TOP_K highest-scoring chunks as grounding context
  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.slice(0, TOP_K);
  const bestMatches = topMatches.map(match => match.content);

  // Feed all the top chunks to the model as context (array param)
  const answer = await generateAnswer({ question, context: bestMatches });

  return {
    question,
    bestMatches: topMatches,
    score: Number(topMatches[0].score.toFixed(4)), // score of the closest chunk
    answer,
    store: 'mysql',
  };
};
