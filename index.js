import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { db } from './db/db.config.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';

// Load environment variables from .env into process.env
dotenv.config();

const app = express();
const port = process.env.PORT || 3788;

// Allow cross-origin requests (e.g. from a frontend on a different port)
app.use(cors());
// Parse incoming JSON request bodies into req.body
app.use(express.json());
// Parse URL-encoded form bodies (e.g. HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// Simple liveness probe to confirm the server is up
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Mount all feature routes under the /api prefix
app.use('/api', mainRouter);
// Centralized error handler must be registered LAST, after all routes
app.use(errorHandler);

// Verify the DB connection before accepting traffic, then start listening
const startServer = async () => {
  try {
    // Grab a connection from the pool to prove the DB is reachable...
    const connection = await db.getConnection();
    // ...then immediately return it to the pool
    connection.release();
    app.listen(port, () => {
      console.log(`RAG demo server running at http://localhost:${port}`);
    });
  } catch (error) {
    // Fail fast: if MySQL is unreachable, don't start a broken server
    console.error(
      'Failed to connect to MySQL. Server not started.',
      error.message,
    );
    process.exit(1);
  }
};

startServer();
