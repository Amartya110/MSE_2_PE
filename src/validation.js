import { NotFoundError, ValidationError } from './errors.js';

export const PLATFORMS = Object.freeze([
  'codeforces',
  'leetcode',
  'codechef',
  'atcoder',
]);

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,50}$/;

export const normalizeUsername = (username) => {
  if (typeof username !== 'string' || !HANDLE_PATTERN.test(username)) {
    throw new ValidationError(
      'Username must be 1-50 characters and contain only letters, numbers, ".", "_" or "-".',
    );
  }
  return username.toLowerCase();
};

export const parsePlatformAndHandle = (platform, handle, clients) => {
  if (!PLATFORMS.includes(platform)) {
    throw new NotFoundError(`Unsupported platform "${platform}".`);
  }
  if (typeof handle !== 'string' || !HANDLE_PATTERN.test(handle)) {
    throw new ValidationError(
      'Handle must be 1-50 characters and contain only letters, numbers, ".", "_" or "-".',
    );
  }
  if (!clients[platform]) {
    throw new NotFoundError(`No client is configured for "${platform}".`);
  }
  return { platform, handle };
};

export const validateHandles = (handles, clients) => {
  if (!handles || typeof handles !== 'object' || Array.isArray(handles)) {
    throw new ValidationError('Request body must include a handles object.');
  }

  const entries = Object.entries(handles);
  if (entries.length === 0) {
    throw new ValidationError('Provide at least one platform handle.');
  }

  return entries.map(([platform, handle]) =>
    parsePlatformAndHandle(platform, handle, clients),
  );
};
