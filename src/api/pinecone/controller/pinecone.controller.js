import { StatusCodes } from 'http-status-codes';
import { getUploadedText } from '../../../utils/ingest-text.js';
import {
  ingestPineconeService,
  queryPineconeService,
} from '../service/pinecone.service.js';

/**
 * POST /api/pinecone
 * Ingest step: read uploaded text and store its embeddings in Pinecone.
 */
export const postPineconeController = async (req, res, next) => {
  try {
    const text = getUploadedText(req);
    const result = await ingestPineconeService(text);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Documents chunked, embedded, and stored in Pinecone.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pinecone?question=...
 * Query step: retrieve the closest chunk from Pinecone and generate an answer.
 */
export const getPineconeController = async (req, res, next) => {
  try {
    const { question } = req.query;
    const result = await queryPineconeService(question);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Query answered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
