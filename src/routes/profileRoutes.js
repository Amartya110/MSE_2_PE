import { Router } from 'express';

export const createProfileRouter = (profileService, { requireAuth }) => {
  const router = Router();

  router.get(
    '/fetch/:platform/:handle',
    requireAuth,
    async (request, response, next) => {
      try {
        const profile = await profileService.fetchProfile(
          request.params.platform,
          request.params.handle,
          request.auth.username,
        );
        response.json({ ok: true, profile });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/sync-all', requireAuth, async (request, response, next) => {
    try {
      const results = await profileService.syncAll(
        request.body?.handles,
        request.auth.username,
      );
      const succeeded = results.filter((result) => result.ok).length;
      response.status(succeeded === results.length ? 200 : 207).json({
        ok: succeeded === results.length,
        synced: succeeded,
        failed: results.length - succeeded,
        results,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
