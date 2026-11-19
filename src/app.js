import express from 'express';
import { createProfileRouter } from './routes/profileRoutes.js';
import { createAnalyticsRouter } from './routes/analyticsRoutes.js';
import { createProblemRouter } from './routes/problemRoutes.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { createExecutionRouter } from './routes/executionRoutes.js';
import { createCompareRouter } from './routes/compareRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';

export const createApp = ({
  profileService,
  userRepository,
  authService,
  executionService,
}) => {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) {
    const trustProxyHops = Number(process.env.TRUST_PROXY);
    if (
      !Number.isInteger(trustProxyHops) ||
      trustProxyHops < 1 ||
      trustProxyHops > 5
    ) {
      throw new Error('TRUST_PROXY must be an integer between 1 and 5.');
    }
    app.set('trust proxy', trustProxyHops);
  }
  app.use(requestLogger);
  app.use(express.json({ limit: '64kb' }));
  app.use((request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/health', (request, response) => {
    response.json({
      ok: true,
      service: 'dspaa',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  const authMiddleware = createAuthMiddleware(authService);
  app.use('/api/auth', createAuthRouter(authService, authMiddleware));
  app.use('/api/compare', createCompareRouter(profileService));
  app.use('/api', createProfileRouter(profileService, authMiddleware));
  app.use('/api/users', createAnalyticsRouter(userRepository, authMiddleware));
  app.use('/api/problems', createProblemRouter(userRepository, authMiddleware));
  app.use('/api/executions', createExecutionRouter(executionService, authMiddleware));

  app.use((request, response) => {
    response.status(404).json({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    const statusCode =
      error.code === 11000 ? 409 : error.statusCode ?? error.status ?? 500;
    if (statusCode >= 500) {
      console.error(
        JSON.stringify({
          event: 'http.error',
          requestId: request.requestId,
          statusCode,
          errorCode: error.code ?? 'INTERNAL_ERROR',
          errorName: error.name ?? 'Error',
        }),
      );
    }
    response.status(statusCode).json({
      ok: false,
      error: {
        code:
          error.code === 11000
            ? 'CONFLICT'
            : error.code ?? 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Request could not be completed.' : error.message,
      },
    });
  });

  return app;
};
