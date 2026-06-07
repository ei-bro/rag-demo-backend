import express from 'express';
import { handleTextUpload } from '../../../middleware/upload.js';
import { queryAssistantValidation } from '../../shared/validation/rag.validation.js';
import {
  getMysqlController,
  postMysqlController,
} from '../controller/mysql.controller.js';

const router = express.Router();

/**
 * @route POST /api/mysql
 * @desc Upload a .txt file, chunk, embed, and store in MySQL
 */
router.post('/', handleTextUpload, postMysqlController);

/**
 * @route GET /api/mysql
 * @desc Query the MySQL RAG assistant
 */
router.get('/', queryAssistantValidation, getMysqlController);

export default router;
