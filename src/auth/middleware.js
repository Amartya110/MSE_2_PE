import { SESSION_COOKIE_NAME } from './tokens.js';
import { AppError } from '../errors.js';

const readCookies = (header = '') => {
  const cookies = {};
  header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separator = part.indexOf('=');
      const key = separator < 0 ? part : part.slice(0, separator);
      const value = separator < 0 ? '' : part.slice(separator + 1);
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = '';
      }
    });
  return cookies;
};

export const getRequestToken = (request) => {
  const authorization = request.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return readCookies(request.headers.cookie)[SESSION_COOKIE_NAME];
};

export const createAuthMiddleware = (authService) => {
  const requireAuth = async (request, response, next) => {
    try {
      request.auth = await authService.authenticate(getRequestToken(request));
      next();
    } catch (error) {
      next(error);
    }
  };

  const requireAdmin = (request, response, next) => {
    if (request.auth?.role !== 'admin') {
      return next(
        new AppError('Administrator access is required.', {
          statusCode: 403,
          code: 'FORBIDDEN',
        }),
      );
    }
    next();
  };

  const requireOwnProfile = (request, response, next) => {
    if (request.auth?.username !== String(request.params.username).toLowerCase()) {
      return next(
        new AppError('You can only access your own coaching data.', {
          statusCode: 403,
          code: 'FORBIDDEN',
        }),
      );
    }
    next();
  };

  return { requireAuth, requireAdmin, requireOwnProfile };
};
