import { StatusCodes } from 'http-status-codes';
import { getUploadedText } from '../../../utils/ingest-text.js';
import {
  ingestChromaService,
  queryChromaService,
} from '../service/chroma-db.service.js';

/**
 * POST /api/chroma-db
 * Ingest step: read uploaded text and store its embeddings in ChromaDB.
 */
export const postChromaDbController = async (req, res, next) => {
  try {
    const text = getUploadedText(req);
    const result = await ingestChromaService(text);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Documents chunked, embedded, and stored in ChromaDB.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chroma-db?question=...
 * Query step: retrieve the closest document from ChromaDB and generate an answer.
 */
export const getChromaDbController = async (req, res, next) => {
  try {
    const { question } = req.query;
    const result = await queryChromaService(question);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Query answered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
