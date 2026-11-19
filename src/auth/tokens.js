import jwt from 'jsonwebtoken';
import { AppError } from '../errors.js';

export const SESSION_COOKIE_NAME = 'cpdsa_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must be set to at least 32 bytes.');
  }
  return secret;
};

export const signSessionToken = (account) =>
  jwt.sign(
    {
      username: account.username,
      role: account.role,
      tokenVersion: account.tokenVersion,
    },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      subject: String(account._id),
      issuer: 'unified-cp-dsa-tracker',
      audience: 'unified-cp-dsa-tracker-web',
      expiresIn: SESSION_DURATION_SECONDS,
    },
  );

export const verifySessionToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'unified-cp-dsa-tracker',
      audience: 'unified-cp-dsa-tracker-web',
    });
  } catch {
    throw new AppError('Authentication is required.', {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    });
  }
};

export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: SESSION_DURATION_SECONDS * 1000,
});

export const clearSessionCookie = (response) =>
  response.clearCookie(SESSION_COOKIE_NAME, {
    ...sessionCookieOptions(),
    maxAge: undefined,
  });
