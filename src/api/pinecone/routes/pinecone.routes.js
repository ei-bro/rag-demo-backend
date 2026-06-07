import express from 'express';
import { handleTextUpload } from '../../../middleware/upload.js';
import { queryAssistantValidation } from '../../shared/validation/rag.validation.js';
import {
  getPineconeController,
  postPineconeController,
} from '../controller/pinecone.controller.js';

const router = express.Router();

/**
 * @route POST /api/pinecone
 * @desc Upload a .txt file, chunk, embed, and store in Pinecone
 */
router.post('/', handleTextUpload, postPineconeController);

/**
 * @route GET /api/pinecone
 * @desc Query the Pinecone RAG assistant
 */
router.get('/', queryAssistantValidation, getPineconeController);

export default router;
