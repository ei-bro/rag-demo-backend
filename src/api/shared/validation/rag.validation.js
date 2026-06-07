import { query } from 'express-validator';
import { validationErrorHandler } from '../../../middleware/validation-handler.js';

// Validation chain for the GET query endpoints: requires a non-empty ?question
export const queryAssistantValidation = [
  query('question')
    .trim() // remove surrounding whitespace first
    .notEmpty()
    .withMessage('Query parameter "question" is required.'),
  validationErrorHandler, // turns any failure above into a 400 response
];
