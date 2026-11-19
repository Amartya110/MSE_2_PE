import bcrypt from 'bcryptjs';
import { Account } from '../models/account.js';
import { User } from '../models/user.js';
import { AppError, ValidationError } from '../errors.js';
import { normalizeUsername } from '../validation.js';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
} from './tokens.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 12;

const createAuthError = (message) =>
  new AppError(message, { statusCode: 401, code: 'INVALID_CREDENTIALS' });

const publicAccount = (account) => ({
  id: String(account._id),
  username: account.username,
  email: account.email,
  role: account.role,
});

const adminUsernames = () =>
  new Set(
    (process.env.ADMIN_USERNAMES ?? '')
      .split(',')
      .map((username) => username.trim().toLowerCase())
      .filter(Boolean),
  );

export class AuthService {
  async register({ username, email, password }) {
    const normalizedUsername = normalizeUsername(username);
    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      throw new ValidationError('Enter a valid email address.');
    }
    if (
      typeof password !== 'string' ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > 128
    ) {
      throw new ValidationError(
        `Password must contain ${PASSWORD_MIN_LENGTH}-128 characters.`,
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingProfile = await User.exists({ username: normalizedUsername });
    if (existingProfile) {
      throw new AppError(
        'That username already has a profile and cannot be claimed. Choose another username.',
        { statusCode: 409, code: 'USERNAME_UNAVAILABLE' },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let account;
    try {
      account = await Account.create({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
        role: adminUsernames().has(normalizedUsername) ? 'admin' : 'user',
      });
      await User.create({ username: normalizedUsername, accountId: account._id });
    } catch (error) {
      if (account) await Account.deleteOne({ _id: account._id });
      if (error.code === 11000) {
        throw new AppError('Username or email is already registered.', {
          statusCode: 409,
          code: 'ACCOUNT_EXISTS',
        });
      }
      throw error;
    }

    return { account: publicAccount(account), token: signSessionToken(account) };
  }

  async login({ username, password }) {
    const normalizedUsername = normalizeUsername(username);
    if (typeof password !== 'string' || password.length === 0) {
      throw new ValidationError('Password is required.');
    }
    const account = await Account.findOne({ username: normalizedUsername })
      .select('+passwordHash')
      .lean();
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      throw createAuthError('Username or password is incorrect.');
    }
    return { account: publicAccount(account), token: signSessionToken(account) };
  }

  async authenticate(token) {
    if (!token) {
      throw new AppError('Authentication is required.', {
        statusCode: 401,
        code: 'UNAUTHENTICATED',
      });
    }
    const claims = verifySessionToken(token);
    const account = await Account.findById(claims.sub).lean();
    if (
      !account ||
      account.username !== claims.username ||
      account.tokenVersion !== claims.tokenVersion
    ) {
      throw new AppError('Session has expired. Please sign in again.', {
        statusCode: 401,
        code: 'SESSION_EXPIRED',
      });
    }
    return publicAccount(account);
  }

  async logout(accountId) {
    if (accountId) {
      await Account.updateOne({ _id: accountId }, { $inc: { tokenVersion: 1 } });
    }
  }

  setSessionCookie(response, token) {
    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  }
}
