import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile } from '../src/normalization/profileNormalizer.js';

test('normalizes Codeforces accepted submissions into unique solved problems and topic counts', () => {
  const profile = normalizeProfile('codeforces', {
    handle: 'sample',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    profile: {
      rating: 1500,
      maxRating: 1600,
      rank: 'specialist',
      registrationTimeSeconds: 10,
    },
    contests: [
      {
        contestId: 1,
        rank: 10,
        newRating: 1500,
        oldRating: 1400,
        ratingUpdateTimeSeconds: 100,
      },
    ],
    submissions: [
      {
        verdict: 'OK',
        problem: { contestId: 1, index: 'A', name: 'One', tags: ['dp'] },
        creationTimeSeconds: 50,
      },
      {
        verdict: 'OK',
        problem: { contestId: 1, index: 'A', name: 'One', tags: ['dp'] },
        creationTimeSeconds: 60,
      },
      {
        verdict: 'WRONG_ANSWER',
        problem: { contestId: 1, index: 'B', name: 'Two', tags: ['graphs'] },
        creationTimeSeconds: 100,
      },
    ],
  });

  assert.equal(profile.cpProfile.rating, 1500);
  assert.equal(profile.cpProfile.contests[0].ratingChange, 100);
  assert.equal(profile.dsaProfile.totalSolved, 1);
  assert.deepEqual(profile.dsaProfile.topics, [
    { name: 'dp', solvedCount: 1, failedAttempts: 0 },
    { name: 'graphs', solvedCount: 0, failedAttempts: 1 },
  ]);
  assert.equal(profile.dsaProfile.solvedProblems[0].problemId, '1-A');
  assert.equal(profile.dsaProfile.solvedProblems[0].solvedAt, new Date(50000).toISOString());
  assert.equal(profile.accountCreatedAt, new Date(10000).toISOString());
  assert.equal(profile.dsaProfile.recentSubmissions[2].verdict, 'WRONG_ANSWER');
  assert.equal(profile.dsaProfile.recentSubmissions[2].problemId, '1-B');
});

test('normalizes AtCoder contest ratings and counts each accepted problem once', () => {
  const profile = normalizeProfile('atcoder', {
    handle: 'sample',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    contests: [
      {
        ContestScreenName: 'abc001',
        ContestName: 'AtCoder Beginner Contest 001',
        NewRating: 400,
        OldRating: 350,
        Place: 2,
        EndTime: '2026-01-01T00:00:00Z',
      },
    ],
    submissions: [
      { result: 'AC', problem_id: 'abc001_a', epoch_second: 100 },
      { result: 'AC', problem_id: 'abc001_a', epoch_second: 200 },
      { result: 'WA', problem_id: 'abc001_b', epoch_second: 300 },
    ],
    problemModels: { abc001_a: { difficulty: 350 } },
  });

  assert.equal(profile.cpProfile.rating, 400);
  assert.equal(profile.cpProfile.contests[0].contestId, 'abc001');
  assert.equal(profile.cpProfile.contests[0].ratingChange, 50);
  assert.equal(profile.dsaProfile.totalSolved, 1);
  assert.equal(profile.dsaProfile.solvedProblems[0].problemId, 'abc001_a');
  assert.equal(profile.dsaProfile.solvedProblems[0].rating, 350);
  assert.deepEqual(profile.dsaProfile.solvedProblems[0].topics, ['ABC-A/B']);
});

test('normalizes LeetCode wrong submissions separately from accepted solve history', () => {
  const profile = normalizeProfile('leetcode', {
    handle: 'sample',
    fetchedAt: '2026-01-01T00:00:00.000Z',
    profile: {
      submitStats: {
        acSubmissionNum: [
          { difficulty: 'All', count: 2 },
          { difficulty: 'Easy', count: 1 },
          { difficulty: 'Medium', count: 1 },
          { difficulty: 'Hard', count: 0 },
        ],
      },
      tagProblemCounts: {
        fundamental: [{ tagName: 'Array', problemsSolved: 2 }],
      },
    },
    contest: { rating: 1500, globalRanking: 10 },
    contestHistory: [
      {
        attended: true,
        rating: 1500,
        ranking: 10,
        contest: { title: 'Weekly Contest', startTime: 100 },
      },
    ],
    recentAccepted: [
      { title: 'Two Sum', titleSlug: 'two-sum', timestamp: '100' },
    ],
    recentSubmissions: [
      {
        title: 'Valid Parentheses',
        titleSlug: 'valid-parentheses',
        timestamp: '200',
        statusDisplay: 'Wrong Answer',
        lang: 'python3',
      },
      {
        title: 'Two Sum',
        titleSlug: 'two-sum',
        timestamp: '100',
        statusDisplay: 'Accepted',
        lang: 'python3',
      },
    ],
  });

  assert.equal(profile.dsaProfile.totalSolved, 2);
  assert.equal(profile.dsaProfile.recentSubmissions[0].verdict, 'Wrong Answer');
  assert.equal(profile.dsaProfile.recentSubmissions[1].verdict, 'accepted');
  assert.equal(profile.dsaProfile.recentSubmissions[0].language, 'python3');
  assert.equal(profile.dsaProfile.topics[0].name, 'Array');
  assert.equal(profile.cpProfile.contests[0].contestName, 'Weekly Contest');
});
