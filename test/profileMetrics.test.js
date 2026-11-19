import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProfileMetrics,
  deriveWeakTags,
} from '../components/profile/profileMetrics.js';

test('builds deduplicated profile metrics, tag accuracy, and sorted activity', () => {
  const profile = {
    username: 'solver',
    platformHandles: new Map([['codeforces', 'cf-solver']]),
    cpProfile: {
      platforms: new Map([
        ['codeforces', { rating: 1400, maxRating: 1800 }],
        ['atcoder', { rating: 1800, maxRating: 2000 }],
      ]),
    },
    dsaProfile: {
      platforms: {
        leetcode: {
          byDifficulty: { easy: 4, medium: 2, hard: 1 },
          totalSolved: 7,
        },
      },
      topics: [
        { name: 'dp', solvedCount: 2, failedAttempts: 6 },
        { name: 'graphs', solvedCount: 5, failedAttempts: 1 },
      ],
    },
    solvedProblems: [
      { platform: 'codeforces', problemId: '4A', rating: 800, tags: ['math'] },
      { platform: 'codeforces', problemId: '4A', rating: 800, tags: ['math'] },
      { platform: 'leetcode', problemId: 'two-sum', rating: null, tags: [] },
    ],
    contestHistory: [
      { platform: 'codeforces', contestId: '2', rating: 1500, date: '2025-02-01' },
      { platform: 'codeforces', contestId: '1', rating: 1300, date: '2025-01-01' },
      { platform: 'atcoder', contestId: '3', rating: null, date: '2025-03-01' },
    ],
    recentSubmissions: [
      {
        platform: 'codeforces',
        problemId: '4A',
        verdict: 'WRONG_ANSWER',
        submittedAt: '2025-02-02T00:00:00.000Z',
      },
      {
        platform: 'leetcode',
        problemId: 'two-sum',
        verdict: 'accepted',
        submittedAt: '2025-02-03T00:00:00.000Z',
      },
    ],
  };

  const metrics = buildProfileMetrics(profile);

  assert.equal(metrics.unifiedCpRating, 1600);
  assert.equal(metrics.unifiedMaxRating, 1900);
  assert.equal(metrics.totalUniqueSolved, 2);
  assert.equal(metrics.dsaDifficulty.easy, 4);
  assert.equal(metrics.dsaDifficulty.total, 2);
  assert.equal(metrics.platformStats[0].handle, 'cf-solver');
  assert.equal(metrics.tags.find((tag) => tag.tag === 'dp').accuracy, 25);
  assert.equal(metrics.tags.find((tag) => tag.tag === 'graphs').status, 'Strong');
  assert.deepEqual(metrics.weakTags.map((tag) => tag.tag), ['dp']);
  assert.deepEqual(
    metrics.contestHistory.map((contest) => contest.contestId),
    ['1', '2'],
  );
  assert.equal(metrics.recentSubmissions[0].problemId, 'two-sum');
  assert.equal(metrics.recentSubmissions[1].rating, 800);
});

test('keeps missing platform ratings unrated and derives weak tags from solved-problem tags', () => {
  const metrics = buildProfileMetrics({
    solvedProblems: [
      { platform: 'codeforces', problemId: '1-A', tags: ['greedy'] },
    ],
  });

  assert.equal(metrics.unifiedCpRating, null);
  assert.equal(metrics.platformStats[0].rating, null);
  assert.equal(metrics.totalUniqueSolved, 1);
  assert.equal(metrics.tags[0].tag, 'greedy');
  assert.deepEqual(deriveWeakTags({ solvedProblems: [{ tags: ['greedy'] }] }), [
    { tag: 'greedy', solved: 1, failed: 0 },
  ]);
});
