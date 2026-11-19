import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { Problem } from '../src/models/problem.js';
import { User } from '../src/models/user.js';
import { UserRepository } from '../src/repositories/userRepository.js';

const mongoUri = process.env.MONGODB_TEST_URI;

const makeProfile = ({
  platform,
  handle,
  rating,
  maxRating,
  topics,
  solvedProblems,
  contestId,
}) => ({
  platform,
  handle,
  fetchedAt: new Date().toISOString(),
  cpProfile: {
    rating,
    maxRating,
    rank: null,
    contests: [
      {
        platform,
        contestId,
        contestName: `${platform} contest`,
        rank: 1,
        rating,
        ratingChange: 25,
        date: new Date().toISOString(),
      },
    ],
  },
  dsaProfile: {
    totalSolved: solvedProblems.length,
    byDifficulty: { easy: 0, medium: 0, hard: 0, unknown: solvedProblems.length },
    topics,
    solvedProblems,
  },
});

test(
  'Mongo repository merges profiles and supports weak-tag, comparison, and recommendation queries',
  { skip: !mongoUri },
  async (t) => {
    const databaseName = `stage2_test_${randomUUID().replaceAll('-', '')}`;
    await mongoose.connect(mongoUri, { dbName: databaseName });
    t.after(async () => {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    });
    await Promise.all([User.init(), Problem.init()]);

    const repository = new UserRepository();
    const username = `stage2_${randomUUID().slice(0, 8)}`;
    const handleOnlyUsername = `linked_${randomUUID().slice(0, 8)}`;
    const linkedProfile = await repository.upsertPlatformHandles(
      handleOnlyUsername,
      { codechef: 'chef_handle' },
    );
    assert.equal(linkedProfile.platformHandles.codechef, 'chef_handle');
    assert.equal(linkedProfile.cpProfile?.platforms?.codechef, undefined);

    const recentSolve = new Date();
    const codeforces = makeProfile({
      platform: 'codeforces',
      handle: 'cf_handle',
      rating: 1200,
      maxRating: 1300,
      contestId: 'cf-1',
      topics: [{ name: 'dp', solvedCount: 1, failedAttempts: 7 }],
      solvedProblems: [
        {
          problemId: 'already-solved',
          title: 'Solved',
          rating: 1200,
          topics: ['dp'],
          solvedAt: recentSolve.toISOString(),
          verdict: 'accepted',
        },
      ],
    });
    await Promise.all([
      repository.upsertSyncedProfile(username, 'cf_handle', codeforces),
      repository.upsertSyncedProfile(
        username,
        'lc_handle',
        makeProfile({
          platform: 'leetcode',
          handle: 'lc_handle',
          rating: 1400,
          maxRating: 1500,
          contestId: 'lc-1',
          topics: [{ name: 'graphs', solvedCount: 2, failedAttempts: 0 }],
          solvedProblems: [
            {
              problemId: 'daily-1',
              title: 'Daily',
              rating: 1000,
              topics: ['graphs'],
              solvedAt: recentSolve.toISOString(),
              verdict: 'accepted',
            },
          ],
        }),
      ),
    ]);
    await repository.upsertSyncedProfile(
      username,
      'cf_handle',
      makeProfile({
        platform: 'codeforces',
        handle: 'cf_handle',
        rating: 1250,
        maxRating: 1325,
        contestId: 'cf-2',
        topics: [{ name: 'dp', solvedCount: 1, failedAttempts: 7 }],
        solvedProblems: [
          {
            problemId: 'already-solved',
            title: 'Solved',
            rating: 1200,
            topics: ['dp'],
            solvedAt: recentSolve.toISOString(),
            verdict: 'accepted',
          },
        ],
      }),
    );

    const storedUser = await repository.getUser(username);
    assert.deepEqual(Object.keys(storedUser.cpProfile.platforms).sort(), [
      'codeforces',
      'leetcode',
    ]);
    assert.equal(storedUser.contestHistory.length, 2);
    assert.equal(
      storedUser.contestHistory.find((contest) => contest.platform === 'codeforces')
        .contestId,
      'cf-2',
    );
    assert.equal(storedUser.solvedProblems.length, 2);

    const weakTags = await repository.getWeakTags(username, {
      minSolved: 3,
      maxFailures: 5,
    });
    assert.equal(weakTags[0].tag, 'dp');
    assert.equal(weakTags[0].failedAttempts, 7);

    const peer = username.replace('stage2_', 'peer_');
    await repository.upsertSyncedProfile(
      peer,
      'peer_cf',
      makeProfile({
        platform: 'codeforces',
        handle: 'peer_cf',
        rating: 1000,
        maxRating: 1100,
        contestId: 'peer-1',
        topics: [{ name: 'dp', solvedCount: 1, failedAttempts: 0 }],
        solvedProblems: [
          {
            problemId: 'already-solved',
            title: 'Solved',
            rating: 1200,
            topics: ['dp'],
            solvedAt: recentSolve.toISOString(),
            verdict: 'accepted',
          },
        ],
      }),
    );
    const comparison = await repository.compareUsers(username, peer);
    assert.equal(comparison[0].ratingPeak, 1500);
    assert.equal(comparison[0].platformRatings.leetcode.rating, 1400);
    assert.equal(comparison[0].solvedLast30Days, 2);
    assert.equal(comparison[0].totalSolved, 2);
    assert.equal(comparison[0].commonSolvedCount, 1);
    assert.equal(comparison[0].uniqueSolvedCount, 1);
    assert.equal(comparison[1].uniqueSolvedCount, 0);
    assert.equal(comparison[1].ratingPeak, 1100);

    await repository.upsertProblem({
      platform: 'codeforces',
      problemId: 'already-solved',
      title: 'Solved problem',
      rating: 1550,
      tags: ['dp'],
    });
    await repository.upsertProblem({
      platform: 'atcoder',
      problemId: 'already-solved',
      title: 'Same id, unsolved on this platform',
      rating: 1600,
      tags: ['dp'],
    });
    await repository.upsertProblem({
      platform: 'leetcode',
      problemId: 'expanded-range',
      title: 'Additional rated practice',
      rating: 1700,
      tags: ['dp'],
    });

    const recommendations = await repository.recommendProblems(username, {
      minSolved: 3,
      maxFailures: 5,
    });
    assert.deepEqual(recommendations.problems.map((problem) => [
      problem.platform,
      problem.problemId,
    ]), [
      ['atcoder', 'already-solved'],
      ['leetcode', 'expanded-range'],
    ]);
    assert.equal(recommendations.problems[0].platform, 'atcoder');

    const changed = await repository.updateProblem('atcoder', 'already-solved', {
      title: 'Updated curated title',
    });
    assert.equal(changed.title, 'Updated curated title');
    assert.equal(
      (await repository.deleteProblem('atcoder', 'already-solved')).deleted,
      true,
    );
    assert.equal(await Problem.countDocuments(), 2);
  },
);
