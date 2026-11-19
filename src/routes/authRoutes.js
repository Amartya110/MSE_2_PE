import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import { clearSessionCookie } from '../auth/tokens.js';

export const createAuthRouter = (authService, { requireAuth }) => {
  const router = Router();

  router.post(
    '/register',
    asyncHandler(async (request, response) => {
      const result = await authService.register(request.body ?? {});
      authService.setSessionCookie(response, result.token);
      response.status(201).json({ ok: true, account: result.account });
    }),
  );

  router.post(
    '/login',
    asyncHandler(async (request, response) => {
      const result = await authService.login(request.body ?? {});
      authService.setSessionCookie(response, result.token);
      response.json({ ok: true, account: result.account });
    }),
  );

  router.post(
    '/logout',
    requireAuth,
    asyncHandler(async (request, response) => {
      await authService.logout(request.auth.id);
      clearSessionCookie(response);
      response.json({ ok: true });
    }),
  );

  router.get(
    '/me',
    requireAuth,
    asyncHandler(async (request, response) => {
      response.json({ ok: true, account: request.auth });
    }),
  );

  return router;
};
