import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

test('live platform comparison accepts public handles without a tracker session', async (t) => {
  const requested = {
    platform: 'atcoder',
    firstHandle: 'first_user',
    secondHandle: 'second_user',
  };
  const app = createApp({
    profileService: {
      comparePlatformUsers: async (input) => {
        assert.deepEqual(input, requested);
        return {
          platform: 'atcoder',
          users: [
            { handle: 'first_user', totalSolved: 10 },
            { handle: 'second_user', totalSolved: 12 },
          ],
        };
      },
      fetchProfile: async () => ({}),
      syncAll: async () => [],
    },
    userRepository: {},
    authService: { authenticate: async () => null },
    executionService: {},
  });
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/compare/atcoder?u1=first_user&u2=second_user`,
    {
      method: 'GET',
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).comparison, {
    platform: 'atcoder',
    users: [
      { handle: 'first_user', totalSolved: 10 },
      { handle: 'second_user', totalSolved: 12 },
    ],
  });
});
