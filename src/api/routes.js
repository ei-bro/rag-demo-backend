import express from 'express';
import chromaDbRoutes from './chroma-db/routes/chroma-db.routes.js';
import mysqlRoutes from './mysql/routes/mysql.routes.js';
import pineconeRoutes from './pinecone/routes/pinecone.routes.js';

// Top-level router that groups every storage backend under /api
export const mainRouter = express.Router();

// Each backend demonstrates the same RAG flow with a different vector store:
mainRouter.use('/mysql', mysqlRoutes); // brute-force search in MySQL (JSON column)
mainRouter.use('/pinecone', pineconeRoutes); // managed cloud vector DB
mainRouter.use('/chroma-db', chromaDbRoutes); // local/self-hosted vector DB
