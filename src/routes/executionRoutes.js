import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from './asyncHandler.js';

export const createExecutionRouter = (executionService, { requireAuth }) => {
  const router = Router();
  const runLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(request, response) {
      response.status(429).json({
        ok: false,
        error: {
          code: 'RUN_RATE_LIMITED',
          message: 'You can run at most 5 code executions per minute.',
        },
      });
    },
  });

  router.post(
    '/run',
    requireAuth,
    runLimiter,
    asyncHandler(async (request, response) => {
      const result = await executionService.run(request.body);
      response.json({ ok: true, result });
    }),
  );

  return router;
};
