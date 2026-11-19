import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { AuthService } from '../src/auth/authService.js';
import { Account } from '../src/models/account.js';
import { Problem } from '../src/models/problem.js';
import { User } from '../src/models/user.js';
import { UserRepository } from '../src/repositories/userRepository.js';

const mongoUri = process.env.MONGODB_TEST_URI;

test(
  'authentication owns profile sync, rejects username claims, and invalidates logout sessions',
  { skip: !mongoUri },
  async (t) => {
    const databaseName = `stage4_auth_${randomUUID().replaceAll('-', '')}`;
    process.env.JWT_SECRET = randomUUID() + randomUUID();
    await mongoose.connect(mongoUri, { dbName: databaseName });
    t.after(async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });
    await Promise.all([Account.init(), User.init(), Problem.init()]);

    const authService = new AuthService();
    const registered = await authService.register({
      username: 'secure_alex',
      email: 'alex@example.com',
      password: 'a-secure-password-123',
    });
    assert.equal(registered.account.username, 'secure_alex');
    assert.equal(await Account.countDocuments(), 1);
    assert.equal((await User.findOne({ username: 'secure_alex' })).accountId.toString(), registered.account.id);

    const login = await authService.login({
      username: 'secure_alex',
      password: 'a-secure-password-123',
    });
    assert.equal(login.account.id, registered.account.id);
    await assert.rejects(
      authService.login({ username: 'secure_alex', password: 'wrong-password' }),
      { code: 'INVALID_CREDENTIALS' },
    );

    await User.create({ username: 'claimed_profile' });
    await assert.rejects(
      authService.register({
        username: 'claimed_profile',
        email: 'claim@example.com',
        password: 'another-secure-password',
      }),
      { code: 'USERNAME_UNAVAILABLE' },
    );
    assert.equal(await Account.countDocuments({ username: 'claimed_profile' }), 0);

    let syncedUsername;
    const app = createApp({
      authService,
      userRepository: new UserRepository(),
      executionService: {
        run: async (payload) => ({ problemId: payload.problemId }),
      },
      profileService: {
        syncAll: async (handles, username) => {
          syncedUsername = username;
          return [];
        },
        fetchProfile: async () => ({}),
      },
    });
    const server = app.listen(0);
    await once(server, 'listening');
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const anonymousSync = await fetch(`${baseUrl}/api/sync-all`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'victim', handles: { codeforces: 'handle' } }),
    });
    assert.equal(anonymousSync.status, 401);

    const anonymousRun = await fetch(`${baseUrl}/api/executions/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceCode: 'not executed' }),
    });
    assert.equal(anonymousRun.status, 401);

    const authenticatedRun = await fetch(`${baseUrl}/api/executions/run`, {
      method: 'POST',
      headers: {
        cookie: `cpdsa_session=${registered.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ problemId: '4A' }),
    });
    assert.equal(authenticatedRun.status, 200);

    const syncResponse = await fetch(`${baseUrl}/api/sync-all`, {
      method: 'POST',
      headers: {
        cookie: `cpdsa_session=${registered.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: 'victim', handles: { codeforces: 'handle' } }),
    });
    assert.equal(syncResponse.status, 200);
    assert.equal(syncedUsername, 'secure_alex');

    const publicProfile = await fetch(`${baseUrl}/api/users/secure_alex`);
    const publicProfilePayload = await publicProfile.json();
    assert.equal(publicProfile.status, 200);
    assert.equal(publicProfilePayload.user.accountId, undefined);
    assert.equal(publicProfilePayload.user.username, 'secure_alex');

    const regularUserProblemWrite = await fetch(`${baseUrl}/api/problems`, {
      method: 'POST',
      headers: {
        cookie: `cpdsa_session=${registered.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        platform: 'codeforces',
        problemId: '4A',
        title: 'Watermelon',
      }),
    });
    assert.equal(regularUserProblemWrite.status, 403);

    await authService.logout(registered.account.id);
    await assert.rejects(authService.authenticate(registered.token), {
      code: 'SESSION_EXPIRED',
    });
  },
);
