import { StatusCodes } from 'http-status-codes';
import { getUploadedText } from '../../../utils/ingest-text.js';
import {
  ingestMysqlService,
  queryMysqlService,
} from '../service/mysql.service.js';

/**
 * POST /api/mysql
 * Ingest step: read the uploaded text, then hand it to the service which
 * chunks, embeds, and stores it. Controllers stay thin; logic lives in services.
 */
export const postMysqlController = async (req, res, next) => {
  try {
    const text = getUploadedText(req);
    const result = await ingestMysqlService(text);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Documents chunked, embedded, and stored in MySQL.',
      data: result,
    });
  } catch (error) {
    // Forward any error to the central error handler
    next(error);
  }
};

/**
 * GET /api/mysql?question=...
 * Query step: answer the user's question using the stored documents.
 */
export const getMysqlController = async (req, res, next) => {
  try {
    const { question } = req.query;
    const result = await queryMysqlService(question);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Query answered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
