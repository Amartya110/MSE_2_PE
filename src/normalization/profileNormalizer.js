const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRatingChange = (contest) => {
  const reportedChange = asNumber(contest.ratingChange ?? contest.RatingChange);
  if (reportedChange !== null) return reportedChange;

  const newRating = asNumber(contest.newRating ?? contest.NewRating);
  const oldRating = asNumber(contest.oldRating ?? contest.OldRating);
  return newRating !== null && oldRating !== null ? newRating - oldRating : null;
};

const normalizeContest = (contest, platform) => ({
  platform,
  contestId: String(
    contest.contestId ??
      contest.ContestScreenName ??
      contest.code ??
      contest.name ??
      contest.contest ??
      '',
  ),
  contestName:
    contest.name ??
    contest.contestName ??
    contest.ContestName ??
    contest.contest ??
    null,
  rank: asNumber(contest.rank ?? contest.place ?? contest.Place),
  rating: asNumber(contest.newRating ?? contest.NewRating ?? contest.rating),
  ratingChange: normalizeRatingChange(contest),
  date:
    typeof (contest.ratingUpdateTimeSeconds ?? contest.RatingUpdateTimeSeconds) ===
    'number'
      ? new Date(
          (contest.ratingUpdateTimeSeconds ?? contest.RatingUpdateTimeSeconds) *
            1000,
        ).toISOString()
      : contest.end_time ?? contest.EndTime ?? contest.date ?? null,
});

const difficultyBucket = (difficulty) => {
  const normalized = String(difficulty ?? '').toLowerCase();
  if (normalized.includes('easy')) return 'easy';
  if (normalized.includes('medium')) return 'medium';
  if (normalized.includes('hard')) return 'hard';
  return 'unknown';
};

const normalizeSubmissionVerdict = (verdict) => {
  const normalized = String(verdict ?? 'unknown').toLowerCase();
  return ['ok', 'ac', 'accepted'].includes(normalized)
    ? 'accepted'
    : String(verdict ?? 'unknown');
};

const normalizeTimestamp = (seconds) => {
  const timestamp = Number(seconds);
  return Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp * 1000).toISOString()
    : null;
};

const normalizeCodeforces = (raw) => {
  const accepted = raw.submissions
    .filter((submission) => submission.verdict === 'OK')
    .sort((left, right) => left.creationTimeSeconds - right.creationTimeSeconds);
  const solvedById = new Map();
  accepted.forEach((submission) => {
    const problem = submission.problem;
    const problemId = `${problem.contestId ?? 'gym'}-${problem.index ?? problem.name}`;
    if (!solvedById.has(problemId)) {
      solvedById.set(problemId, {
        problem,
        solvedAt: normalizeTimestamp(submission.creationTimeSeconds),
      });
    }
  });
  const solvedProblems = [...solvedById.entries()].map(
    ([problemId, { problem, solvedAt }]) => ({
      platform: 'codeforces',
      problemId,
      title: problem.name ?? problemId,
      difficulty: 'unknown',
      rating: asNumber(problem.rating),
      topics: problem.tags ?? [],
      solvedAt,
      verdict: 'accepted',
    }),
  );
  const topicStats = new Map();
  solvedProblems.forEach((problem) => {
    [...new Set(problem.topics)].forEach((topic) => {
      const stats = topicStats.get(topic) ?? { solvedCount: 0, failedAttempts: 0 };
      stats.solvedCount += 1;
      topicStats.set(topic, stats);
    });
  });
  raw.submissions
    .filter(
      (submission) =>
        submission.verdict &&
        submission.verdict !== 'OK' &&
        submission.verdict !== 'TESTING',
    )
    .forEach((submission) => {
      [...new Set(submission.problem?.tags ?? [])].forEach((topic) => {
        const stats = topicStats.get(topic) ?? {
          solvedCount: 0,
          failedAttempts: 0,
        };
        stats.failedAttempts += 1;
        topicStats.set(topic, stats);
      });
    });
  const recentSubmissions = raw.submissions
    .filter((submission) => submission.verdict !== 'TESTING' && submission.problem)
    .slice(0, 1000)
    .map((submission) => ({
      platform: 'codeforces',
      problemId: `${submission.problem.contestId ?? 'gym'}-${submission.problem.index ?? submission.problem.name}`,
      title: submission.problem.name ?? '',
      tags: submission.problem.tags ?? [],
      verdict: normalizeSubmissionVerdict(submission.verdict),
      language: submission.programmingLanguage ?? null,
      submittedAt: normalizeTimestamp(submission.creationTimeSeconds),
    }));

  return {
    platform: 'codeforces',
    handle: raw.handle,
    fetchedAt: raw.fetchedAt,
    accountCreatedAt: normalizeTimestamp(raw.profile.registrationTimeSeconds),
    contestCount: raw.contests.length,
    cpProfile: {
      rating: asNumber(raw.profile.rating),
      maxRating: asNumber(raw.profile.maxRating),
      rank: raw.profile.rank ?? null,
      contests: raw.contests.map((contest) => normalizeContest(contest, 'codeforces')),
    },
    dsaProfile: {
      totalSolved: solvedProblems.length,
      byDifficulty: { easy: 0, medium: 0, hard: 0, unknown: solvedProblems.length },
      topics: [...topicStats.entries()]
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.solvedCount - a.solvedCount || a.name.localeCompare(b.name)),
      solvedProblems,
      recentSubmissions,
    },
  };
};

const normalizeLeetCode = (raw) => {
  const accepted = raw.recentAccepted.map((submission) => ({
    platform: 'leetcode',
    problemId: submission.titleSlug,
    title: submission.title,
    difficulty: 'unknown',
    rating: null,
    topics: [],
    solvedAt:
      Number.isFinite(Number(submission.timestamp))
        ? new Date(Number(submission.timestamp) * 1000).toISOString()
        : null,
    verdict: 'accepted',
  }));
  const byDifficulty = (raw.profile.submitStats.acSubmissionNum ?? []).reduce(
    (counts, entry) => {
      const key = difficultyBucket(entry.difficulty);
      if (key !== 'unknown') counts[key] = asNumber(entry.count) ?? 0;
      return counts;
    },
    { easy: 0, medium: 0, hard: 0, unknown: 0 },
  );
  const totalSolved =
    asNumber(
      (raw.profile.submitStats.acSubmissionNum ?? []).find(
        (entry) => entry.difficulty.toLowerCase() === 'all',
      )?.count,
    ) ?? byDifficulty.easy + byDifficulty.medium + byDifficulty.hard;
  const topicStats = [
    ...(raw.profile.tagProblemCounts?.fundamental ?? []),
    ...(raw.profile.tagProblemCounts?.intermediate ?? []),
    ...(raw.profile.tagProblemCounts?.advanced ?? []),
  ];
  const contests = (raw.contestHistory ?? [])
    .filter((contest) => contest.attended)
    .map((contest) =>
      normalizeContest(
        {
          contestId: contest.contest?.title,
          contestName: contest.contest?.title,
          rank: contest.ranking,
          rating: contest.rating,
          date: contest.contest?.startTime
            ? new Date(Number(contest.contest.startTime) * 1000).toISOString()
            : null,
        },
        'leetcode',
      ),
    );
  const recentSubmissions = (raw.recentSubmissions ?? [])
    .slice(0, 100)
    .map((submission) => ({
      platform: 'leetcode',
      problemId: submission.titleSlug ?? submission.title,
      title: submission.title ?? '',
      tags: [],
      verdict: normalizeSubmissionVerdict(submission.statusDisplay),
      language: submission.lang ?? null,
      submittedAt: normalizeTimestamp(submission.timestamp),
    }));

  return {
    platform: 'leetcode',
    handle: raw.handle,
    fetchedAt: raw.fetchedAt,
    accountCreatedAt: null,
    contestCount: asNumber(raw.contest?.attendedContestsCount),
    cpProfile: {
      rating: asNumber(raw.contest?.rating),
      maxRating: contests.reduce(
        (maximum, contest) =>
          contest.rating === null ? maximum : Math.max(maximum, contest.rating),
        asNumber(raw.contest?.rating) ?? 0,
      ) || asNumber(raw.contest?.rating),
      rank: asNumber(raw.contest?.globalRanking),
      contests: contests.length
        ? contests
        : raw.contest
          ? [
            {
              platform: 'leetcode',
              contestId: 'aggregate',
              contestName: 'Contest summary',
              rank: asNumber(raw.contest.globalRanking),
              rating: asNumber(raw.contest.rating),
              ratingChange: null,
              date: null,
            },
          ]
          : [],
    },
    dsaProfile: {
      totalSolved,
      byDifficulty,
      topics: topicStats
        .map((topic) => ({
          name: topic.tagName,
          solvedCount: asNumber(topic.problemsSolved) ?? 0,
          failedAttempts: 0,
        }))
        .filter((topic) => topic.name),
      solvedProblems: accepted,
      recentSubmissions,
    },
  };
};

const normalizeCodeChef = (raw) => {
  const profile = raw.profile;
  const solvedProblems = raw.solvedProblems.map((problem) => ({
    platform: 'codechef',
    problemId: String(problem.problemId ?? problem.code ?? problem.name ?? ''),
    title: problem.title ?? problem.name ?? String(problem.problemId ?? ''),
    difficulty: problem.difficulty ?? 'unknown',
    rating: asNumber(problem.rating),
    topics: problem.tags ?? [],
    solvedAt: problem.solvedAt ?? null,
    verdict: 'accepted',
  }));
  const recentSubmissions = (raw.recentSubmissions ?? [])
    .slice(0, 100)
    .map((submission) => ({
      platform: 'codechef',
      problemId: String(
        submission.problemId ?? submission.code ?? submission.name ?? '',
      ),
      title: submission.title ?? submission.name ?? '',
      tags: submission.tags ?? [],
      verdict: normalizeSubmissionVerdict(
        submission.verdict ?? submission.result,
      ),
      language: submission.language ?? null,
      submittedAt: submission.submittedAt ?? null,
    }));
  const currentRating = asNumber(profile.currentRating);

  return {
    platform: 'codechef',
    handle: raw.handle,
    fetchedAt: raw.fetchedAt,
    cpProfile: {
      rating: currentRating,
      maxRating: asNumber(profile.highestRating),
      rank: profile.globalRank ?? profile.countryRank ?? null,
      contests: raw.contests.map((contest) => normalizeContest(contest, 'codechef')),
    },
    dsaProfile: {
      totalSolved: solvedProblems.length,
      byDifficulty: solvedProblems.reduce(
        (counts, problem) => {
          counts[difficultyBucket(problem.difficulty)] += 1;
          return counts;
        },
        { easy: 0, medium: 0, hard: 0, unknown: 0 },
      ),
      topics: [],
      solvedProblems,
      recentSubmissions,
    },
  };
};

const normalizeAtCoder = (raw) => {
  const taskCategory = (problemId) => {
    const id = String(problemId ?? '').toLowerCase();
    const abcMatch = id.match(/^abc\d+_([a-z]+)$/);
    if (abcMatch) {
      const task = abcMatch[1];
      if (['a', 'b'].includes(task)) return 'ABC-A/B';
      if (['c', 'd'].includes(task)) return 'ABC-C/D';
      if (['e', 'f'].includes(task)) return 'ABC-E/F';
      if (['g', 'h', 'ex'].includes(task)) return 'ABC-G/Ex';
      return 'ABC-Other';
    }
    if (id.startsWith('arc')) return 'ARC';
    if (id.startsWith('agc')) return 'AGC';
    return null;
  };
  const solvedById = new Map();
  raw.submissions
    .filter((submission) => submission.result === 'AC')
    .sort((left, right) => left.epoch_second - right.epoch_second)
    .forEach((submission) => {
      if (!solvedById.has(submission.problem_id)) {
        solvedById.set(submission.problem_id, {
          platform: 'atcoder',
          problemId: submission.problem_id,
          title: submission.problem_id,
          difficulty: 'unknown',
          rating: asNumber(
            raw.problemModels?.[submission.problem_id]?.difficulty,
          ),
          topics: [taskCategory(submission.problem_id)].filter(Boolean),
          solvedAt: new Date(submission.epoch_second * 1000).toISOString(),
          verdict: 'accepted',
        });
      }
    });

  const contests = raw.contests.map((contest) => normalizeContest(contest, 'atcoder'));
  const latestRating = contests.at(-1)?.rating ?? null;
  const maxRating = contests.reduce(
    (maximum, contest) =>
      contest.rating === null ? maximum : Math.max(maximum, contest.rating),
    0,
  );
  const solvedProblems = [...solvedById.values()];
  const recentSubmissions = raw.submissions
    .slice(0, 500)
    .map((submission) => ({
      platform: 'atcoder',
      problemId: submission.problem_id,
      title: submission.problem_id,
      tags: [taskCategory(submission.problem_id)].filter(Boolean),
      verdict: normalizeSubmissionVerdict(submission.result),
      language: submission.language ?? null,
      submittedAt: normalizeTimestamp(submission.epoch_second),
    }));
  const topicCounts = new Map();
  solvedProblems.forEach((problem) => {
    problem.topics.forEach((topic) => {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    });
  });

  return {
    platform: 'atcoder',
    handle: raw.handle,
    fetchedAt: raw.fetchedAt,
    accountCreatedAt: null,
    contestCount: contests.length,
    submissionWindowStart: raw.submissionWindowStart ?? null,
    submissionLimit: raw.submissionLimit ?? null,
    problemModelError: raw.problemModelError ?? null,
    cpProfile: {
      rating: latestRating,
      maxRating: maxRating || null,
      rank: null,
      contests,
    },
    dsaProfile: {
      totalSolved: solvedProblems.length,
      byDifficulty: { easy: 0, medium: 0, hard: 0, unknown: solvedProblems.length },
      topics: [...topicCounts.entries()].map(([name, solvedCount]) => ({
        name,
        solvedCount,
        failedAttempts: 0,
      })),
      solvedProblems,
      recentSubmissions,
    },
  };
};

export const normalizers = {
  codeforces: normalizeCodeforces,
  leetcode: normalizeLeetCode,
  codechef: normalizeCodeChef,
  atcoder: normalizeAtCoder,
};

export const normalizeProfile = (platform, raw) => {
  const normalize = normalizers[platform];
  if (!normalize) throw new Error(`No profile normalizer registered for ${platform}.`);
  return normalize(raw);
};
