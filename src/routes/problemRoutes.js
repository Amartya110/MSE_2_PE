import { Router } from 'express';
import { ValidationError } from '../errors.js';
import { PLATFORMS } from '../validation.js';
import { asyncHandler } from './asyncHandler.js';

const editableFields = new Set([
  'title',
  'rating',
  'tags',
  'difficulty',
  'url',
  'statement',
  'sampleTestCases',
]);

const validatePlatform = (platform) => {
  if (!PLATFORMS.includes(platform)) {
    throw new ValidationError('Unsupported problem platform.');
  }
};

const validateProblemId = (problemId) => {
  if (typeof problemId !== 'string' || problemId.length < 1 || problemId.length > 200) {
    throw new ValidationError('problemId must be 1-200 characters.');
  }
};

const validateFields = (
  input,
  { partial = false, allowIdentity = false } = {},
) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Problem payload must be a JSON object.');
  }
  for (const key of Object.keys(input)) {
    if (
      !editableFields.has(key) &&
      !(allowIdentity && (key === 'platform' || key === 'problemId'))
    ) {
      throw new ValidationError(`Field "${key}" cannot be written.`);
    }
  }
  if (!partial && (typeof input.title !== 'string' || !input.title.trim())) {
    throw new ValidationError('title is required.');
  }
  if (input.title !== undefined && (typeof input.title !== 'string' || !input.title.trim())) {
    throw new ValidationError('title must be a non-empty string.');
  }
  if (
    input.rating !== undefined &&
    input.rating !== null &&
    (!Number.isFinite(input.rating) || input.rating < 0)
  ) {
    throw new ValidationError('rating must be a non-negative number or null.');
  }
  if (
    input.tags !== undefined &&
    (!Array.isArray(input.tags) ||
      input.tags.some((tag) => typeof tag !== 'string' || !tag.trim()))
  ) {
    throw new ValidationError('tags must be an array of non-empty strings.');
  }
  if (input.statement !== undefined && typeof input.statement !== 'string') {
    throw new ValidationError('statement must be a string.');
  }
  if (
    input.sampleTestCases !== undefined &&
    (!Array.isArray(input.sampleTestCases) ||
      input.sampleTestCases.length > 10 ||
      input.sampleTestCases.some(
        (testCase) =>
          !testCase ||
          typeof testCase.input !== 'string' ||
          testCase.input.length > 4096 ||
          (testCase.expectedOutput !== undefined &&
            (typeof testCase.expectedOutput !== 'string' ||
              testCase.expectedOutput.length > 4096)),
      ))
  ) {
    throw new ValidationError(
      'sampleTestCases must contain at most 10 input/output pairs of at most 4096 characters each.',
    );
  }
  if (input.url !== undefined && input.url !== null) {
    let url;
    try {
      url = new URL(input.url);
    } catch {
      throw new ValidationError('url must be a valid HTTPS URL.');
    }
    if (url.protocol !== 'https:') {
      throw new ValidationError('url must be a valid HTTPS URL.');
    }
  }
  return input;
};

const parseRatingFilter = (value, name) => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError(`${name} must be a non-negative number.`);
  }
  return parsed;
};

export const createProblemRouter = (
  userRepository,
  { requireAuth, requireAdmin },
) => {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (request, response) => {
      const platforms = request.query.platform
        ? String(request.query.platform).split(',')
        : PLATFORMS;
      platforms.forEach(validatePlatform);
      const problems = await userRepository.listProblems({
        platforms,
        tag: request.query.tag,
        minRating: parseRatingFilter(request.query.minRating, 'minRating'),
        maxRating: parseRatingFilter(request.query.maxRating, 'maxRating'),
        limit:
          request.query.limit === undefined
            ? 50
            : Number.parseInt(request.query.limit, 10),
      });
      response.json({ ok: true, count: problems.length, problems });
    }),
  );

  router.post(
    '/',
    requireAuth,
    requireAdmin,
    asyncHandler(async (request, response) => {
      const payload = validateFields(request.body, { allowIdentity: true });
      validatePlatform(payload.platform);
      validateProblemId(payload.problemId);
      const problem = await userRepository.upsertProblem({
        ...payload,
        problemId: payload.problemId.trim(),
        title: payload.title.trim(),
        tags: payload.tags?.map((tag) => tag.trim()) ?? [],
      });
      response.status(201).json({ ok: true, problem });
    }),
  );

  router.get(
    '/:platform/:problemId',
    asyncHandler(async (request, response) => {
      validatePlatform(request.params.platform);
      validateProblemId(request.params.problemId);
      const problem = await userRepository.getProblem(
        request.params.platform,
        request.params.problemId,
      );
      response.json({ ok: true, problem });
    }),
  );

  router.put(
    '/:platform/:problemId',
    requireAuth,
    requireAdmin,
    asyncHandler(async (request, response) => {
      validatePlatform(request.params.platform);
      validateProblemId(request.params.problemId);
      const updates = validateFields(request.body, { partial: true });
      if (Object.keys(updates).length === 0) {
        throw new ValidationError('Provide at least one problem field to update.');
      }
      const problem = await userRepository.updateProblem(
        request.params.platform,
        request.params.problemId,
        Object.fromEntries(
          Object.entries(updates).map(([key, value]) => [
            key,
            key === 'title' ? value.trim() : key === 'tags' ? value.map((tag) => tag.trim()) : value,
          ]),
        ),
      );
      response.json({ ok: true, problem });
    }),
  );

  router.delete(
    '/:platform/:problemId',
    requireAuth,
    requireAdmin,
    asyncHandler(async (request, response) => {
      validatePlatform(request.params.platform);
      validateProblemId(request.params.problemId);
      const result = await userRepository.deleteProblem(
        request.params.platform,
        request.params.problemId,
      );
      response.json({ ok: true, ...result });
    }),
  );

  return router;
};
