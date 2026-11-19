import test from 'node:test';
import assert from 'node:assert/strict';
import { CodeChefClient } from '../src/platforms/codechefClient.js';
import { UpstreamError } from '../src/errors.js';
import { createProfileService } from '../src/services/profileService.js';

test('CodeChef provider HTTP 402 explains that only profile statistics failed', async () => {
  const client = new CodeChefClient();
  client.fetchJson = async () => {
    throw new UpstreamError('CodeChef returned HTTP 402.');
  };

  await assert.rejects(
    client.fetchProfile('chef_handle'),
    /CodeChef data provider returned HTTP 402 \(payment required\)/,
  );
});

test('sync saves submitted handles before an upstream profile failure', async () => {
  const calls = [];
  const service = createProfileService({
    clients: {
      codechef: {
        fetchProfile: async () => {
          calls.push('fetch');
          throw new Error('CodeChef provider returned HTTP 402.');
        },
      },
    },
    profileCache: { write: async () => {} },
    logger: { log: async () => {} },
    userRepository: {
      upsertPlatformHandles: async (username, handles) => {
        calls.push({ username, handles });
      },
    },
  });

  const results = await service.syncAll(
    { codechef: 'chef_handle' },
    'tracker_user',
  );

  assert.deepEqual(calls, [
    { username: 'tracker_user', handles: { codechef: 'chef_handle' } },
    'fetch',
  ]);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].handle, 'chef_handle');
  assert.match(results[0].error.message, /HTTP 402/);
});

test('live platform comparison fetches and summarizes two profiles without syncing them', async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const makeProfile = (handle, rating, tags) => ({
    handle,
    fetchedAt: new Date().toISOString(),
    profile: { rating, maxRating: rating + 100, rank: 'expert' },
    contests: [],
    submissions: [
      {
        verdict: 'OK',
        problem: {
          contestId: 1,
          index: 'A',
          name: 'Sample problem',
          rating: 800,
          tags,
        },
        creationTimeSeconds: nowSeconds,
        programmingLanguage: 'GNU C++20',
      },
    ],
  });
  const service = createProfileService({
    clients: {
      codeforces: {
        fetchProfile: async (handle) =>
          makeProfile(handle, handle === 'first' ? 1600 : 1400, ['dp']),
      },
    },
    profileCache: { write: async () => assert.fail('Comparison must not cache.') },
    logger: { log: async () => {} },
    userRepository: {
      upsertPlatformHandles: async () => assert.fail('Comparison must not persist handles.'),
      upsertSyncedProfile: async () => assert.fail('Comparison must not sync profiles.'),
    },
  });

  const comparison = await service.comparePlatformUsers({
    platform: 'codeforces',
    firstHandle: 'first',
    secondHandle: 'second',
  });

  assert.equal(comparison.users.length, 2);
  assert.equal(comparison.users[0].handle, 'first');
  assert.equal(comparison.users[0].currentRating, 1600);
  assert.equal(comparison.users[1].currentRating, 1400);
  assert.equal(comparison.users[0].totalSolved, 1);
  assert.equal(comparison.users[0].recentActivity.solved30Days, 1);
  assert.equal(comparison.users[0].topics[0].tag, 'dp');
  assert.equal(comparison.scoring.method.includes('ties count as half'), true);
  assert.equal(comparison.scoring.availableCategories, 3);
  assert.equal(comparison.winner.handle, null);
});
