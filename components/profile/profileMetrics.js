export const PROFILE_PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', profileUrl: 'https://codeforces.com/profile/' },
  { key: 'leetcode', label: 'LeetCode', profileUrl: 'https://leetcode.com/u/' },
  { key: 'codechef', label: 'CodeChef', profileUrl: 'https://www.codechef.com/users/' },
  { key: 'atcoder', label: 'AtCoder', profileUrl: 'https://atcoder.jp/users/' },
];

const asObject = (value) =>
  value instanceof Map ? Object.fromEntries(value.entries()) : value ?? {};

const asCount = (value) =>
  Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;

const asRating = (value) =>
  value !== null &&
  value !== undefined &&
  value !== '' &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;

const getTagMastery = (user) => {
  const topicRecords = user?.dsaProfile?.topics ?? [];
  const solvedProblems = user?.solvedProblems ?? [];
  const tags = topicRecords.reduce((result, topic) => {
    const key = String(topic.name ?? '').trim().toLowerCase();
    if (!key) return result;
    const current = result.get(key) ?? {
      tag: String(topic.name).trim(),
      solved: 0,
      failed: 0,
    };
    current.solved += asCount(topic.solvedCount);
    current.failed += asCount(topic.failedAttempts);
    result.set(key, current);
    return result;
  }, new Map());

  if (topicRecords.length === 0) {
    solvedProblems.forEach((problem) => {
      (problem.tags ?? []).forEach((rawTag) => {
        const key = String(rawTag).trim().toLowerCase();
        if (!key) return;
        const current = tags.get(key) ?? {
          tag: String(rawTag).trim(),
          solved: 0,
          failed: 0,
        };
        current.solved += 1;
        tags.set(key, current);
      });
    });
  }

  return [...tags.values()].map((item) => {
    const attempted = item.solved + item.failed;
    const accuracy = attempted ? (item.solved / attempted) * 100 : 0;
    const weak = item.solved < 3 || item.failed > 5;
    return {
      ...item,
      attempted,
      accuracy,
      status: weak
        ? 'Needs work'
        : item.solved >= 5 && accuracy >= 80
          ? 'Strong'
          : 'Building',
    };
  });
};

export const deriveWeakTags = (user) =>
  getTagMastery(user)
    .filter((tag) => tag.solved < 3 || tag.failed > 5)
    .sort(
      (left, right) =>
        left.solved - right.solved ||
        right.failed - left.failed ||
        left.tag.localeCompare(right.tag),
    )
    .slice(0, 8)
    .map(({ tag, solved, failed }) => ({ tag, solved, failed }));

export const buildProfileMetrics = (user) => {
  const cpPlatforms = asObject(user?.cpProfile?.platforms);
  const dsaPlatforms = asObject(user?.dsaProfile?.platforms);
  const solvedByPlatform = (user?.solvedProblems ?? []).filter(
    (problem) => problem.platform && problem.problemId,
  );
  const uniqueSolved = [
    ...solvedByPlatform
      .reduce((unique, problem) => {
        unique.set(`${problem.platform}:${problem.problemId}`, problem);
        return unique;
      }, new Map())
      .values(),
  ];

  const platformStats = PROFILE_PLATFORMS.map(({ key, label, profileUrl }) => {
    const cp = asObject(cpPlatforms[key]);
    const dsa = asObject(dsaPlatforms[key]);
    const solvedCount = asCount(
      dsa.totalSolved ??
        solvedByPlatform.filter((problem) => problem.platform === key).length,
    );
    return {
      key,
      label,
      profileUrl,
      handle: asObject(user?.platformHandles)[key] ?? null,
      rating: asRating(cp.rating),
      maxRating: asRating(cp.maxRating),
      solvedCount,
      syncedAt: cp.syncedAt ?? dsa.syncedAt ?? user?.syncedAt ?? null,
    };
  });

  const ratedPlatforms = platformStats.filter(
    (platform) => platform.rating !== null,
  );
  const unifiedCpRating = ratedPlatforms.length
    ? Math.round(
        ratedPlatforms.reduce((sum, platform) => sum + platform.rating, 0) /
          ratedPlatforms.length,
      )
    : null;
  const ratedMaxPlatforms = platformStats.filter(
    (platform) => platform.maxRating !== null,
  );
  const unifiedMaxRating = ratedMaxPlatforms.length
    ? Math.round(
        ratedMaxPlatforms.reduce((sum, platform) => sum + platform.maxRating, 0) /
          ratedMaxPlatforms.length,
      )
    : null;

  const dsaDifficulty = platformStats.reduce(
    (summary, platform) => {
      const byDifficulty = asObject(
        asObject(dsaPlatforms[platform.key]).byDifficulty,
      );
      summary.easy += asCount(byDifficulty.easy);
      summary.medium += asCount(byDifficulty.medium);
      summary.hard += asCount(byDifficulty.hard);
      return summary;
    },
    { easy: 0, medium: 0, hard: 0, total: uniqueSolved.length },
  );

  const solvedRatingById = solvedByPlatform.reduce((lookup, problem) => {
    lookup.set(`${problem.platform}:${problem.problemId}`, problem.rating);
    return lookup;
  }, new Map());
  const recentSubmissions = (user?.recentSubmissions ?? [])
    .filter((submission) => submission.platform && submission.problemId)
    .map((submission) => ({
      ...submission,
      rating:
        submission.rating ??
        solvedRatingById.get(`${submission.platform}:${submission.problemId}`) ??
        null,
    }))
    .sort(
      (left, right) =>
        new Date(right.submittedAt ?? 0).getTime() -
        new Date(left.submittedAt ?? 0).getTime(),
    );

  const contestHistory = [...(user?.contestHistory ?? [])]
    .filter(
      (contest) =>
        contest.rating !== null &&
        contest.rating !== undefined &&
        contest.rating !== '' &&
        Number.isFinite(Number(contest.rating)) &&
        contest.date &&
        !Number.isNaN(new Date(contest.date).getTime()),
    )
    .sort(
      (left, right) =>
        new Date(left.date).getTime() - new Date(right.date).getTime(),
    );

  const tags = getTagMastery(user);
  return {
    platformStats,
    unifiedCpRating,
    unifiedMaxRating,
    totalUniqueSolved: uniqueSolved.reduce((count) => count + 1, 0),
    dsaDifficulty,
    tags,
    weakTags: deriveWeakTags(user),
    recentSubmissions,
    contestHistory,
  };
};
