import express from 'express';
import { handleTextUpload } from '../../../middleware/upload.js';
import { queryAssistantValidation } from '../../shared/validation/rag.validation.js';
import {
  getChromaDbController,
  postChromaDbController,
} from '../controller/chroma-db.controller.js';

const router = express.Router();

/**
 * @route POST /api/chroma-db
 * @desc Upload a .txt file, chunk, embed, and store in ChromaDB
 */
router.post('/', handleTextUpload, postChromaDbController);

/**
 * @route GET /api/chroma-db
 * @desc Query the ChromaDB RAG assistant
 */
router.get('/', queryAssistantValidation, getChromaDbController);

export default router;
