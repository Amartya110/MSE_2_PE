import { Router } from 'express';
import { ValidationError } from '../errors.js';
import { asyncHandler } from './asyncHandler.js';

const parseNumber = (value, name, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ValidationError(`${name} must be a number from ${min} to ${max}.`);
  }
  return parsed;
};

export const createAnalyticsRouter = (
  userRepository,
  { requireAuth, requireOwnProfile },
) => {
  const router = Router();

  router.get(
    '/:username/weak-tags',
    requireAuth,
    requireOwnProfile,
    asyncHandler(async (request, response) => {
      const weakTags = await userRepository.getWeakTags(request.params.username, {
        minSolved: parseNumber(request.query.minSolved, 'minSolved'),
        maxFailures: parseNumber(request.query.maxFailures, 'maxFailures'),
      });
      response.json({ ok: true, username: request.params.username, weakTags });
    }),
  );

  router.get(
    '/:username/compare/:otherUsername',
    asyncHandler(async (request, response) => {
      const users = await userRepository.compareUsers(
        request.params.username,
        request.params.otherUsername,
      );
      response.json({ ok: true, users });
    }),
  );

  router.get(
    '/:username/recommendations',
    requireAuth,
    requireOwnProfile,
    asyncHandler(async (request, response) => {
      const result = await userRepository.recommendProblems(
        request.params.username,
        {
          limit: parseNumber(request.query.limit, 'limit', { min: 1, max: 100 }) ?? 100,
          minSolved:
            parseNumber(request.query.minSolved, 'minSolved') ?? 3,
          maxFailures:
            parseNumber(request.query.maxFailures, 'maxFailures') ?? 5,
        },
      );
      response.json({ ok: true, username: request.params.username, ...result });
    }),
  );

  router.get(
    '/:username',
    asyncHandler(async (request, response) => {
      const user = await userRepository.getPublicProfile(request.params.username);
      response.json({ ok: true, user });
    }),
  );

  return router;
};
