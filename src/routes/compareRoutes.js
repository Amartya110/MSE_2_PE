import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createCompareController } from '../controllers/compareController.js';

export const createCompareRouter = (profileService) => {
  const router = Router();
  const compareLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(request, response) {
      response.status(429).json({
        ok: false,
        error: {
          code: 'COMPARE_RATE_LIMITED',
          message: 'You can make at most 10 live platform comparisons per minute.',
        },
      });
    },
  });

  router.get('/:platform', compareLimiter, createCompareController(profileService));
  return router;
};
