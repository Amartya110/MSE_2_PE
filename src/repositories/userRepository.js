import { Problem } from '../models/problem.js';
import { User } from '../models/user.js';
import { problemCatalog } from '../../data/problemCatalog.js';
import { normalizeUsername, PLATFORMS } from '../validation.js';
import { NotFoundError, ValidationError } from '../errors.js';

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapValues = (value) => {
  if (value instanceof Map) return [...value.values()];
  return Object.values(value ?? {});
};

const topicWeaknessPipelineMatch = (minSolved, maxFailures, platforms) => ({
  $and: [
    { 'dsaProfile.topics.platform': { $in: platforms } },
    {
      $or: [
        { 'dsaProfile.topics.solvedCount': { $lt: minSolved } },
        { 'dsaProfile.topics.failedAttempts': { $gt: maxFailures } },
      ],
    },
  ],
});

const validateThreshold = (value, name) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${name} must be a non-negative integer.`);
  }
};

export class UserRepository {
  async upsertPlatformHandles(username, handles) {
    const owner = normalizeUsername(username);
    const entries = Object.entries(handles ?? {});
    if (entries.length === 0) {
      throw new ValidationError('Provide at least one platform handle.');
    }

    const handleUpdates = {};
    for (const [platform, handle] of entries) {
      if (
        !PLATFORMS.includes(platform) ||
        typeof handle !== 'string' ||
        !/^[A-Za-z0-9_.-]{1,50}$/.test(handle)
      ) {
        throw new ValidationError(`Invalid ${platform} platform handle.`);
      }
      handleUpdates[`platformHandles.${platform}`] = handle;
    }

    await User.updateOne(
      { username: owner },
      {
        $set: handleUpdates,
        $setOnInsert: { username: owner },
      },
      { upsert: true },
    );
    return this.getUser(owner);
  }

  async upsertSyncedProfile(username, handle, profile) {
    const owner = normalizeUsername(username);
    const platform = profile.platform;
    if (!PLATFORMS.includes(platform)) {
      throw new ValidationError(`Unsupported platform "${platform}".`);
    }

    const cpStats = {
      rating: profile.cpProfile.rating,
      maxRating: profile.cpProfile.maxRating,
      rank: profile.cpProfile.rank,
      syncedAt: asDate(profile.fetchedAt) ?? new Date(),
    };
    const dsaStats = {
      totalSolved: profile.dsaProfile.totalSolved,
      byDifficulty: profile.dsaProfile.byDifficulty,
      syncedAt: asDate(profile.fetchedAt) ?? new Date(),
    };
    const contests = profile.cpProfile.contests.map((contest) => ({
      ...contest,
      date: asDate(contest.date),
    }));
    const solvedProblems = profile.dsaProfile.solvedProblems.map((problem) => ({
      platform,
      problemId: String(problem.problemId),
      title: problem.title,
      rating: problem.rating,
      tags: problem.topics ?? problem.tags ?? [],
      solvedAt: asDate(problem.solvedAt),
      verdict: problem.verdict ?? 'unknown',
    }));
    const topics = profile.dsaProfile.topics.map((topic) => ({
      platform,
      name: topic.name,
      solvedCount: topic.solvedCount,
      failedAttempts: topic.failedAttempts ?? 0,
    }));
    const recentSubmissions = (profile.dsaProfile.recentSubmissions ?? [])
      .slice(0, 100)
      .map((submission) => ({
        platform,
        problemId: String(submission.problemId),
        title: submission.title ?? '',
        tags: submission.tags ?? [],
        verdict: submission.verdict ?? 'unknown',
        language: submission.language ?? null,
        submittedAt: asDate(submission.submittedAt),
      }));
    const updatePipeline = [
      {
        $set: {
          username: { $ifNull: ['$username', { $literal: owner }] },
          createdAt: { $ifNull: ['$createdAt', '$$NOW'] },
          updatedAt: '$$NOW',
          syncedAt: '$$NOW',
          platformHandles: {
            $mergeObjects: [
              { $ifNull: ['$platformHandles', {}] },
              { $literal: { [platform]: handle } },
            ],
          },
          cpProfile: {
            $mergeObjects: [
              { $ifNull: ['$cpProfile', {}] },
              {
                platforms: {
                  $mergeObjects: [
                    { $ifNull: ['$cpProfile.platforms', {}] },
                    { $literal: { [platform]: cpStats } },
                  ],
                },
              },
            ],
          },
          dsaProfile: {
            $mergeObjects: [
              { $ifNull: ['$dsaProfile', {}] },
              {
                platforms: {
                  $mergeObjects: [
                    { $ifNull: ['$dsaProfile.platforms', {}] },
                    { $literal: { [platform]: dsaStats } },
                  ],
                },
                topics: {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ['$dsaProfile.topics', []] },
                        as: 'topic',
                        cond: { $ne: ['$$topic.platform', platform] },
                      },
                    },
                    { $literal: topics },
                  ],
                },
              },
            ],
          },
          contestHistory: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ['$contestHistory', []] },
                  as: 'contest',
                  cond: { $ne: ['$$contest.platform', platform] },
                },
              },
              { $literal: contests },
            ],
          },
          solvedProblems: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ['$solvedProblems', []] },
                  as: 'problem',
                  cond: { $ne: ['$$problem.platform', platform] },
                },
              },
              { $literal: solvedProblems },
            ],
          },
          recentSubmissions: {
            $concatArrays: [
              {
                $filter: {
                  input: { $ifNull: ['$recentSubmissions', []] },
                  as: 'submission',
                  cond: { $ne: ['$$submission.platform', platform] },
                },
              },
              { $literal: recentSubmissions },
            ],
          },
        },
      },
    ];
    try {
      await User.collection.updateOne(
        { username: owner },
        updatePipeline,
        { upsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      const retry = await User.collection.updateOne(
        { username: owner },
        updatePipeline,
      );
      if (retry.matchedCount === 0) throw error;
    }

    const user = await User.findOne({ username: owner }).lean();
    if (!user) throw new Error(`Upsert failed for user "${owner}".`);
    return user;
  }

  async getUser(username, { projection } = {}) {
    const user = await User.findOne(
      { username: normalizeUsername(username) },
      projection,
    ).lean();
    if (!user) throw new NotFoundError(`User "${username}" has not been synced.`);
    return user;
  }

  async getPublicProfile(username) {
    const user = await User.findOne(
      { username: normalizeUsername(username) },
      {
        _id: 0,
        username: 1,
        platformHandles: 1,
        cpProfile: 1,
        dsaProfile: 1,
        contestHistory: 1,
        solvedProblems: 1,
        syncedAt: 1,
      },
    ).lean();
    if (!user) throw new NotFoundError(`User "${username}" has not been synced.`);
    return user;
  }

  async getWeakTags(
    username,
    { minSolved = 3, maxFailures = 5, platforms = PLATFORMS } = {},
  ) {
    validateThreshold(minSolved, 'minSolved');
    validateThreshold(maxFailures, 'maxFailures');
    if (
      !Array.isArray(platforms) ||
      platforms.length === 0 ||
      platforms.some((platform) => !PLATFORMS.includes(platform))
    ) {
      throw new ValidationError('platforms must contain supported platform names.');
    }

    const owner = normalizeUsername(username);
    const userExists = await User.exists({ username: owner });
    if (!userExists) throw new NotFoundError(`User "${username}" has not been synced.`);
    const hasTopics = await User.exists({
      username: owner,
      'dsaProfile.topics': { $elemMatch: { platform: { $in: platforms } } },
    });
    if (!hasTopics) return [];

    return User.aggregate([
      { $match: { username: owner } },
      { $unwind: '$dsaProfile.topics' },
      {
        $match: topicWeaknessPipelineMatch(minSolved, maxFailures, platforms),
      },
      {
        $group: {
          _id: '$dsaProfile.topics.name',
          solvedCount: { $sum: '$dsaProfile.topics.solvedCount' },
          failedAttempts: { $sum: '$dsaProfile.topics.failedAttempts' },
          platforms: { $addToSet: '$dsaProfile.topics.platform' },
        },
      },
      {
        $match: {
          $or: [
            { solvedCount: { $lt: minSolved } },
            { failedAttempts: { $gt: maxFailures } },
          ],
        },
      },
      { $sort: { failedAttempts: -1, solvedCount: 1, _id: 1 } },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          solvedCount: 1,
          failedAttempts: 1,
          platforms: 1,
        },
      },
    ]);
  }

  async compareUsers(firstUsername, secondUsername) {
    const usernames = [
      normalizeUsername(firstUsername),
      normalizeUsername(secondUsername),
    ];
    if (usernames[0] === usernames[1]) {
      throw new ValidationError('Choose two different usernames to compare.');
    }

    const users = await User.find(
      { username: { $in: usernames } },
      {
        username: 1,
        'cpProfile.platforms': 1,
        'dsaProfile.platforms': 1,
        'dsaProfile.topics': 1,
        solvedProblems: 1,
      },
    ).lean();
    const byName = new Map(users.map((user) => [user.username, user]));
    const missing = usernames.find((username) => !byName.has(username));
    if (missing) throw new NotFoundError(`User "${missing}" has not been synced.`);

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const summarize = (user) => {
      const platforms =
        user.cpProfile?.platforms instanceof Map
          ? [...user.cpProfile.platforms.entries()]
          : Object.entries(user.cpProfile?.platforms ?? {});
      const platformRatings = Object.fromEntries(
        platforms.map(([platform, stats]) => [
          platform,
          {
            rating: stats.rating ?? null,
            maxRating: stats.maxRating ?? null,
            rank: stats.rank ?? null,
          },
        ]),
      );
      const ratingPeak = platforms.reduce(
        (peak, [, stats]) =>
          Math.max(peak, stats.maxRating ?? stats.rating ?? 0),
        0,
      );
      const mastery = new Map();
      (user.dsaProfile?.topics ?? []).forEach((topic) => {
        const stats = mastery.get(topic.name) ?? {
          tag: topic.name,
          solvedCount: 0,
          failedAttempts: 0,
        };
        stats.solvedCount += topic.solvedCount;
        stats.failedAttempts += topic.failedAttempts;
        mastery.set(topic.name, stats);
      });
      const solvedLast30Days = new Set(
        (user.solvedProblems ?? [])
          .filter(
            (problem) =>
              problem.verdict === 'accepted' &&
              problem.solvedAt &&
              new Date(problem.solvedAt).getTime() >= cutoff,
          )
          .map((problem) => `${problem.platform}:${problem.problemId}`),
      ).size;
      const solvedKeys = new Set(
        (user.solvedProblems ?? [])
          .filter((problem) => problem.verdict === 'accepted')
          .map((problem) => `${problem.platform}:${problem.problemId}`),
      );
      const dsaPlatforms =
        user.dsaProfile?.platforms instanceof Map
          ? [...user.dsaProfile.platforms.values()]
          : Object.values(user.dsaProfile?.platforms ?? {});
      const difficultyCounts = dsaPlatforms.reduce(
        (counts, stats) => {
          counts.easy += stats.byDifficulty?.easy ?? 0;
          counts.medium += stats.byDifficulty?.medium ?? 0;
          counts.hard += stats.byDifficulty?.hard ?? 0;
          return counts;
        },
        { easy: 0, medium: 0, hard: 0 },
      );

      return {
        username: user.username,
        ratingPeak,
        platformRatings,
        topicMastery: [...mastery.values()].sort(
          (a, b) => b.solvedCount - a.solvedCount || a.tag.localeCompare(b.tag),
        ),
        solvedLast30Days,
        difficultyCounts,
        solvedKeys: [...solvedKeys],
      };
    };

    const summaries = usernames.map((username) => summarize(byName.get(username)));
    const firstSolved = new Set(summaries[0].solvedKeys);
    const secondSolved = new Set(summaries[1].solvedKeys);
    const commonSolvedCount = [...firstSolved].filter((key) =>
      secondSolved.has(key),
    ).length;

    return summaries.map(({ solvedKeys, ...summary }) => ({
      ...summary,
      totalSolved: solvedKeys.length,
      commonSolvedCount,
      uniqueSolvedCount: solvedKeys.length - commonSolvedCount,
    }));
  }

  async recommendProblems(
    username,
    { limit = 100, minSolved = 3, maxFailures = 5 } = {},
  ) {
    validateThreshold(limit, 'limit');
    if (limit < 1 || limit > 100) {
      throw new ValidationError('limit must be between 1 and 100.');
    }

    const owner = normalizeUsername(username);
    const user = await this.getUser(owner, {
      projection: { username: 1, 'cpProfile.platforms': 1 },
    });
    const ratings = mapValues(user.cpProfile?.platforms)
      .map((stats) => stats.rating)
      .filter((rating) => Number.isFinite(rating));
    const userRating = ratings.length ? Math.max(...ratings) : 0;
    const minRating = userRating + 100;
    const maxRating = userRating + 250;
    const expandedMinRating = Math.max(800, userRating - 200);
    const expandedMaxRating = Math.max(1400, userRating + 500);
    const weakTags = await this.getWeakTags(owner, { minSolved, maxFailures });
    const weakTagNames = weakTags.map((tag) => tag.tag);

    const solvedUser = await User.findOne(
      {
        username: owner,
        solvedProblems: { $elemMatch: { verdict: 'accepted' } },
      },
      { solvedProblems: 1 },
    ).lean();
    const solvedByPlatform = new Map(
      PLATFORMS.map((platform) => [
        platform,
        (solvedUser?.solvedProblems ?? [])
          .filter((problem) => problem.platform === platform)
          .map((problem) => problem.problemId),
      ]),
    );
    const projection = {
      platform: 1,
      problemId: 1,
      title: 1,
      rating: 1,
      tags: 1,
      difficulty: 1,
      url: 1,
    };
    const makePlatformExclusions = (additionalProblems = []) =>
      PLATFORMS.map((platform) => ({
        platform,
        problemId: {
          $nin: [
            ...solvedByPlatform.get(platform),
            ...additionalProblems
              .filter((problem) => problem.platform === platform)
              .map((problem) => problem.problemId),
          ],
        },
      }));
    const sortedProblemQuery = (filter, count) =>
      Problem.find(filter, projection)
        .sort({ rating: 1, platform: 1, problemId: 1 })
        .limit(count)
        .lean();

    const problems = [];
    const loadTier = async ({ ratingMin, ratingMax, tags }) => {
      const remaining = limit - problems.length;
      if (remaining <= 0) return;
      const filter = {
        platform: { $in: PLATFORMS },
        rating: { $gte: ratingMin, $lte: ratingMax },
        $or: makePlatformExclusions(problems),
      };
      if (tags?.length) filter.tags = { $in: tags };
      const tier = await sortedProblemQuery(filter, remaining);
      problems.push(...tier);
    };

    await loadTier({ ratingMin: minRating, ratingMax: maxRating, tags: weakTagNames });
    await loadTier({
      ratingMin: maxRating + 1,
      ratingMax: expandedMaxRating,
      tags: weakTagNames,
    });
    await loadTier({
      ratingMin: expandedMinRating,
      ratingMax: expandedMaxRating,
    });

    return {
      userRating,
      targetRating: { min: minRating, max: maxRating },
      expandedRating: { min: expandedMinRating, max: expandedMaxRating },
      weakTags,
      problems: problems.map((problem) => {
        const matchingTags = (problem.tags ?? []).filter((tag) =>
          weakTagNames.includes(tag),
        );
        return {
          ...problem,
          reason: matchingTags.length
            ? `Matches weak tag(s): ${matchingTags.join(', ')}`
            : `Additional rated practice within ${expandedMinRating}-${expandedMaxRating}.`,
        };
      }),
    };
  }

  async listProblems({
    platforms = PLATFORMS,
    tag,
    minRating,
    maxRating,
    limit = 50,
  } = {}) {
    validateThreshold(limit, 'limit');
    if (limit < 1 || limit > 100) {
      throw new ValidationError('limit must be between 1 and 100.');
    }
    if (
      platforms.length === 0 ||
      platforms.some((platform) => !PLATFORMS.includes(platform))
    ) {
      throw new ValidationError('platforms must contain supported platform names.');
    }
    const query = { platform: { $in: platforms } };
    if (tag) query.tags = { $in: [tag] };
    if (minRating !== undefined || maxRating !== undefined) {
      query.rating = {};
      if (minRating !== undefined) query.rating.$gte = minRating;
      if (maxRating !== undefined) query.rating.$lte = maxRating;
    }

    return Problem.find(query, {
      platform: 1,
      problemId: 1,
      title: 1,
      rating: 1,
      tags: 1,
      difficulty: 1,
      url: 1,
    })
      .sort({ rating: 1, platform: 1, problemId: 1 })
      .limit(limit)
      .lean();
  }

  async getProblem(platform, problemId) {
    const problem =
      (await Problem.findOne({ platform, problemId }).lean()) ??
      problemCatalog.find(
        (entry) =>
          entry.platform === platform && entry.problemId === problemId,
      );
    if (!problem) throw new NotFoundError('Problem was not found.');
    return problem;
  }

  async upsertProblem(problem) {
    return Problem.findOneAndUpdate(
      { platform: problem.platform, problemId: problem.problemId },
      { $set: problem },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
  }

  async updateProblem(platform, problemId, updates) {
    const problem = await Problem.findOneAndUpdate(
      { platform, problemId },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    if (!problem) throw new NotFoundError('Problem was not found.');
    return problem;
  }

  async deleteProblem(platform, problemId) {
    const result = await Problem.deleteOne({ platform, problemId });
    if (result.deletedCount === 0) throw new NotFoundError('Problem was not found.');
    return { platform, problemId, deleted: true };
  }
}
