const DAY_MS = 24 * 60 * 60 * 1000;
const CF_RATING_BUCKETS = [
  { label: '800–999', min: 800, max: 999 },
  { label: '1000–1199', min: 1000, max: 1199 },
  { label: '1200–1399', min: 1200, max: 1399 },
  { label: '1400–1599', min: 1400, max: 1599 },
  { label: '1600–1799', min: 1600, max: 1799 },
  { label: '1800–1999', min: 1800, max: 1999 },
  { label: '2000–2199', min: 2000, max: 2199 },
  { label: '2200–2399', min: 2200, max: 2399 },
  { label: '2400+', min: 2400, max: Number.POSITIVE_INFINITY },
];

const asNumber = (value) =>
  value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value)
    : null;

const mean = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const validDate = (value) => {
  const timestamp = new Date(value ?? '').getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const uniqueSolvedProblems = (profile) => {
  const solved = (profile.dsaProfile.solvedProblems ?? []).filter(
    (problem) => problem.verdict === 'accepted' && problem.problemId,
  );
  return [
    ...solved
      .reduce((byId, problem) => {
        byId.set(String(problem.problemId), problem);
        return byId;
      }, new Map())
      .values(),
  ];
};

const dateKey = (value) => {
  const timestamp = validDate(value);
  if (timestamp === null) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
};

const getStreaks = (solvedProblems, totalSolved) => {
  const days = [
    ...new Set(solvedProblems.map((problem) => dateKey(problem.solvedAt)).filter(Boolean)),
  ].sort();
  if (!days.length) {
    return { current: totalSolved === 0 ? 0 : null, best: totalSolved === 0 ? 0 : null };
  }

  let best = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = Date.parse(`${days[index - 1]}T00:00:00Z`);
    const current = Date.parse(`${days[index]}T00:00:00Z`);
    if (current - previous === DAY_MS) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  let current = 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
  if (days.at(-1) === today || days.at(-1) === yesterday) {
    current = 1;
    for (let index = days.length - 1; index > 0; index -= 1) {
      const previous = Date.parse(`${days[index - 1]}T00:00:00Z`);
      const date = Date.parse(`${days[index]}T00:00:00Z`);
      if (date - previous !== DAY_MS) break;
      current += 1;
    }
  }
  return { current, best };
};

const getActivity = (solvedProblems, totalSolved, now = Date.now()) => {
  if (!solvedProblems.length) {
    return {
      daysKnown: 0,
      solved30: totalSolved === 0 ? 0 : null,
      solved90: totalSolved === 0 ? 0 : null,
    };
  }
  const dates = solvedProblems
    .map((problem) => validDate(problem.solvedAt))
    .filter((timestamp) => timestamp !== null);
  if (!dates.length) return { daysKnown: 0, solved30: null, solved90: null };
  return {
    daysKnown: dates.length,
    solved30: new Set(
      solvedProblems
        .filter((problem) => {
          const date = validDate(problem.solvedAt);
          return date !== null && date >= now - 30 * DAY_MS;
        })
        .map((problem) => problem.problemId),
    ).size,
    solved90: new Set(
      solvedProblems
        .filter((problem) => {
          const date = validDate(problem.solvedAt);
          return date !== null && date >= now - 90 * DAY_MS;
        })
        .map((problem) => problem.problemId),
    ).size,
  };
};

const submissionStats = (profile) => {
  const submissions = profile.dsaProfile.recentSubmissions ?? [];
  const accepted = submissions.filter(
    (submission) => submission.verdict === 'accepted',
  );
  const grouped = submissions.reduce((groups, submission) => {
    if (!submission.problemId || !submission.submittedAt) return groups;
    const group = groups.get(submission.problemId) ?? [];
    group.push({
      timestamp: validDate(submission.submittedAt),
      accepted: submission.verdict === 'accepted',
    });
    groups.set(submission.problemId, group);
    return groups;
  }, new Map());
  const speedSamples = [...grouped.values()]
    .map((attempts) => {
      const ordered = attempts
        .filter((attempt) => attempt.timestamp !== null)
        .sort((left, right) => left.timestamp - right.timestamp);
      const firstAttempt = ordered[0]?.timestamp;
      const firstAccepted = ordered.find((attempt) => attempt.accepted)?.timestamp;
      if (
        firstAttempt === undefined ||
        firstAccepted === undefined ||
        firstAccepted <= firstAttempt
      ) {
        return null;
      }
      return (firstAccepted - firstAttempt) / 60000;
    })
    .filter((minutes) => minutes !== null);
  const solvedInWindow = new Set(accepted.map((submission) => submission.problemId)).size;

  return {
    count: submissions.length,
    acceptedCount: accepted.length,
    successRate: submissions.length
      ? (accepted.length / submissions.length) * 100
      : null,
    attemptsPerSolved: solvedInWindow ? submissions.length / solvedInWindow : null,
    speedMinutes: mean(speedSamples),
    speedSamples: speedSamples.length,
    accepted,
  };
};

const preferredSolvingTime = (solvedProblems) => {
  const buckets = [
    { key: 'morning', label: 'Morning (05:00–11:59 UTC)', count: 0 },
    { key: 'afternoon', label: 'Afternoon (12:00–16:59 UTC)', count: 0 },
    { key: 'evening', label: 'Evening (17:00–21:59 UTC)', count: 0 },
    { key: 'night', label: 'Night (22:00–04:59 UTC)', count: 0 },
  ];
  solvedProblems.forEach((problem) => {
    const timestamp = validDate(problem.solvedAt);
    if (timestamp === null) return;
    const hour = new Date(timestamp).getUTCHours();
    const index = hour >= 5 && hour < 12 ? 0 : hour < 17 && hour >= 12 ? 1 : hour < 22 && hour >= 17 ? 2 : 3;
    buckets[index].count += 1;
  });
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  return buckets.map((bucket) => ({
    ...bucket,
    percent: total ? (bucket.count / total) * 100 : null,
  }));
};

const buildDifficultyDistribution = (platform, profile, solvedProblems) => {
  if (platform === 'codeforces') {
    return CF_RATING_BUCKETS.map(({ label, min, max }) => ({
      label,
      count: solvedProblems.filter((problem) => {
        const rating = asNumber(problem.rating);
        return rating !== null && rating >= min && rating <= max;
      }).length,
    }));
  }
  if (platform === 'leetcode') {
    return ['easy', 'medium', 'hard'].map((difficulty) => ({
      label: difficulty[0].toUpperCase() + difficulty.slice(1),
      count: asNumber(profile.dsaProfile.byDifficulty[difficulty]) ?? 0,
    }));
  }

  const atcoderRatingBuckets = [
    { label: '<400', min: Number.NEGATIVE_INFINITY, max: 399 },
    { label: '400–799', min: 400, max: 799 },
    { label: '800–1199', min: 800, max: 1199 },
    { label: '1200–1599', min: 1200, max: 1599 },
    { label: '1600–1999', min: 1600, max: 1999 },
    { label: '2000+', min: 2000, max: Number.POSITIVE_INFINITY },
  ];
  return atcoderRatingBuckets.map(({ label, min, max }) => ({
    label,
    count: solvedProblems.filter((problem) => {
      const rating = asNumber(problem.rating);
      return rating !== null && rating >= min && rating <= max;
    }).length,
  }));
};

const buildTaskCategoryDistribution = (platform, solvedProblems) => {
  if (platform !== 'atcoder') return [];
  const counts = new Map();
  solvedProblems.forEach((problem) => {
    const category = problem.topics?.find((topic) =>
      /^(ABC-|ARC$|AGC$)/.test(topic),
    );
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  });
  return ['ABC-A/B', 'ABC-C/D', 'ABC-E/F', 'ABC-G/Ex', 'ARC', 'AGC', 'ABC-Other']
    .map((label) => ({ label, count: counts.get(label) ?? 0 }));
};

const buildTagMetrics = (platform, profile, solvedProblems) => {
  const tags = new Map();
  (profile.dsaProfile.topics ?? []).forEach((topic) => {
    const name = String(topic.name ?? '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    tags.set(key, {
      tag: name,
      solved: asNumber(topic.solvedCount) ?? 0,
      failed: asNumber(topic.failedAttempts) ?? 0,
      ratings: [],
    });
  });
  solvedProblems.forEach((problem) => {
    (problem.topics ?? []).forEach((name) => {
      const key = String(name).toLowerCase();
      const current = tags.get(key) ?? {
        tag: String(name),
        solved: 0,
        failed: 0,
        ratings: [],
      };
      if (!tags.has(key)) current.solved += 1;
      if (asNumber(problem.rating) !== null) current.ratings.push(Number(problem.rating));
      tags.set(key, current);
    });
  });
  return [...tags.values()]
    .map((item) => {
      const attempts = item.solved + item.failed;
      return {
        tag: item.tag,
        solved: item.solved,
        failed: item.failed,
        averageRating: mean(item.ratings),
        accuracy:
          platform === 'codeforces' && attempts
            ? (item.solved / attempts) * 100
            : null,
      };
    })
    .sort((left, right) => right.solved - left.solved || left.tag.localeCompare(right.tag));
};

const buildRatingHistory = (profile) => {
  const history = (profile.cpProfile.contests ?? [])
    .filter((contest) => asNumber(contest.rating) !== null)
    .map((contest) => ({
      contestId: contest.contestId,
      contestName: contest.contestName ?? contest.contestId,
      date: contest.date,
      rating: Number(contest.rating),
      rank: asNumber(contest.rank),
      ratingChange: asNumber(contest.ratingChange),
    }))
    .sort((left, right) => (validDate(left.date) ?? 0) - (validDate(right.date) ?? 0));
  return history.map((contest, index) => ({
    ...contest,
    ratingChange:
      contest.ratingChange ??
      (index > 0 ? contest.rating - history[index - 1].rating : null),
  }));
};

const buildSkillGrowth = (profile, ratingHistory) => {
  const changes = ratingHistory
    .map((contest) => contest.ratingChange)
    .filter((change) => change !== null);
  const tail = changes.slice(-3);
  const averageChange = mean(changes);
  const momentum = mean(tail);
  const average = mean(changes);
  const volatility = changes.length
    ? Math.sqrt(
        changes.reduce((sum, change) => sum + (change - average) ** 2, 0) /
          changes.length,
      )
    : null;
  const consistencyPercent = changes.length
    ? (changes.filter((change) => change >= 0).length / changes.length) * 100
    : null;
  const recentFormPercent = tail.length
    ? (tail.filter((change) => change >= 0).length / tail.length) * 100
    : null;
  const ratingValues = ratingHistory.map((contest) => contest.rating);
  const contests = ratingHistory.filter((contest) => contest.contestId !== 'aggregate');
  return {
    totalGrowth:
      ratingValues.length > 1
        ? ratingValues[ratingValues.length - 1] - ratingValues[0]
        : null,
    averageChange,
    momentum,
    maxSingleGain: changes.length ? Math.max(...changes) : null,
    volatility,
    consistencyPercent,
    recentFormPercent,
    ratingHistory,
    contests,
    skillValue: null,
  };
};

const buildGrowthAnalysis = (profile, solvedProblems, ratingHistory) => {
  const known = solvedProblems
    .map((problem) => {
      const solvedAt = validDate(problem.solvedAt);
      const problemRating = asNumber(problem.rating);
      if (solvedAt === null || problemRating === null) return null;
      const ratingAtSolve = ratingHistory
        .filter((contest) => {
          const contestDate = validDate(contest.date);
          return contestDate !== null && contestDate <= solvedAt;
        })
        .at(-1)?.rating;
      if (ratingAtSolve === undefined) return null;
      return problemRating - ratingAtSolve;
    })
    .filter((difference) => difference !== null);
  const above100 = known.filter((difference) => difference >= 100).length;
  const above200 = known.filter((difference) => difference >= 200).length;
  const rate100 = known.length ? (above100 / known.length) * 100 : null;
  const rate200 = known.length ? (above200 / known.length) * 100 : null;
  return {
    knownRatedSolves: known.length,
    above100,
    above200,
    rate100,
    rate200,
    nextStep:
      rate200 === null
        ? 'A dated submission history with problem ratings is not available for this platform.'
        : rate200 < 10
          ? 'Add one problem rated at least 200 points above your solve-time rating to each weekly practice set.'
          : 'Keep challenging yourself; review the hardest problems that took multiple attempts.',
    handle: profile.handle,
  };
};

const buildImplementationScore = (platform, profile, solvedProblems, tagMetrics) => {
  const total = asNumber(profile.dsaProfile.totalSolved) ?? solvedProblems.length;
  let hardCount = null;
  if (platform === 'leetcode') {
    hardCount = asNumber(profile.dsaProfile.byDifficulty.hard) ?? 0;
  } else if (platform === 'codeforces') {
    const rated = solvedProblems.filter((problem) => asNumber(problem.rating) !== null);
    hardCount = rated.length
      ? rated.filter((problem) => Number(problem.rating) >= 1600).length
      : null;
  } else {
    const rated = solvedProblems.filter((problem) => asNumber(problem.rating) !== null);
    hardCount = rated.length
      ? rated.filter((problem) => Number(problem.rating) >= 1600).length
      : null;
  }
  const implementationTag = tagMetrics.find(
    (topic) => topic.tag.toLowerCase() === 'implementation',
  );
  const implementationCount = implementationTag?.solved ?? null;
  const averagePoints = mean(
    solvedProblems
      .map((problem) => asNumber(problem.rating))
      .filter((rating) => rating !== null),
  );
  const components = [
    {
      label: 'Solved volume (capped at 1,000)',
      weight: 40,
      value: Math.min(total, 1000) / 10,
    },
  ];
  if (hardCount !== null && total > 0) {
    components.push({
      label: 'Hard-problem share',
      weight: 30,
      value: (hardCount / total) * 100,
    });
  }
  if (implementationCount !== null && total > 0) {
    components.push({
      label: 'Implementation-tag share',
      weight: 30,
      value: (implementationCount / total) * 100,
    });
  }
  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  const score =
    totalWeight > 0
      ? components.reduce((sum, item) => sum + item.value * item.weight, 0) /
        totalWeight
      : null;
  return {
    score,
    totalSolved: total,
    hardCount,
    implementationCount,
    implementationPercent:
      implementationCount !== null && total
        ? (implementationCount / total) * 100
        : null,
    averagePoints,
    components: components.map((item) => ({
      ...item,
      contribution: (item.value * item.weight) / totalWeight,
    })),
  };
};

const buildContestWins = (first, second) => {
  const firstContests = new Map(
    first.ratingHistory
      .filter((contest) => contest.contestId && contest.rank !== null)
      .map((contest) => [contest.contestId, contest.rank]),
  );
  const secondContests = new Map(
    second.ratingHistory
      .filter((contest) => contest.contestId && contest.rank !== null)
      .map((contest) => [contest.contestId, contest.rank]),
  );
  const shared = [...firstContests.keys()].filter((id) => secondContests.has(id));
  const wins = shared.filter((id) => firstContests.get(id) < secondContests.get(id)).length;
  const ties = shared.filter((id) => firstContests.get(id) === secondContests.get(id)).length;
  return {
    wins,
    losses: shared.length - wins - ties,
    ties,
    sharedContests: shared.length,
    winRate: shared.length ? (wins / shared.length) * 100 : null,
  };
};

const rankInfo = (platform, rating, rawRank) => {
  if (rating === null) return { title: 'Unrated', color: '#808080' };
  if (platform === 'codeforces') {
    const ranks = [
      [1200, 'Newbie', '#808080'],
      [1400, 'Pupil', '#008000'],
      [1600, 'Specialist', '#03A89E'],
      [1900, 'Expert', '#0000FF'],
      [2100, 'Candidate Master', '#AA00AA'],
      [2300, 'Master', '#FF8C00'],
      [2400, 'International Master', '#FF8C00'],
      [2600, 'Grandmaster', '#FF0000'],
      [3000, 'International Grandmaster', '#FF0000'],
      [Number.POSITIVE_INFINITY, 'Legendary Grandmaster', '#FF0000'],
    ];
    const rank = ranks.find(([ceiling]) => rating < ceiling);
    return {
      title:
        rawRank?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
        rank?.[1] ||
        'Unrated',
      color: rank?.[2] ?? '#808080',
    };
  }
  if (platform === 'atcoder') {
    const ranks = [
      [400, 'Gray', '#808080'],
      [800, 'Brown', '#804000'],
      [1200, 'Green', '#008000'],
      [1600, 'Cyan', '#03A89E'],
      [2000, 'Blue', '#0000FF'],
      [2400, 'Yellow', '#C0A000'],
      [2800, 'Orange', '#FF8C00'],
      [Number.POSITIVE_INFINITY, 'Red', '#FF0000'],
    ];
    const rank = ranks.find(([ceiling]) => rating < ceiling);
    return { title: rank?.[1] ?? 'Unrated', color: rank?.[2] ?? '#808080' };
  }
  return {
    title: rawRank ? `Global rank #${rawRank}` : 'Contest rating',
    color: '#3B5998',
  };
};

const summarizeProfile = (platform, profile, now) => {
  const solvedProblems = uniqueSolvedProblems(profile);
  const totalSolved = asNumber(profile.dsaProfile.totalSolved) ?? solvedProblems.length;
  const history = buildRatingHistory(profile);
  const rating = asNumber(profile.cpProfile.rating) ?? history.at(-1)?.rating ?? null;
  const peakRating =
    asNumber(profile.cpProfile.maxRating) ??
    (history.length ? Math.max(...history.map((contest) => contest.rating)) : rating);
  const rank = rankInfo(platform, rating, profile.cpProfile.rank);
  const activity = getActivity(solvedProblems, totalSolved, now);
  const streaks = getStreaks(solvedProblems, totalSolved);
  const submissions = submissionStats(profile);
  const tags = buildTagMetrics(platform, profile, solvedProblems);
  const historyChanges = history
    .map((contest) => contest.ratingChange)
    .filter((change) => change !== null);
  const growth = buildSkillGrowth(profile, history);
  const knownDifficulty = solvedProblems
    .map((problem) => asNumber(problem.rating))
    .filter((value) => value !== null);
  const difficultyMean =
    platform === 'leetcode'
      ? (() => {
          const counts = profile.dsaProfile.byDifficulty;
          const count = counts.easy + counts.medium + counts.hard;
          return count
            ? (counts.easy + counts.medium * 2 + counts.hard * 3) / count
            : null;
        })()
      : mean(knownDifficulty);
  const averageDifficultyLabel =
    platform === 'codeforces'
      ? 'Average problem rating'
      : platform === 'leetcode'
        ? 'Average difficulty index (Easy=1, Hard=3)'
        : 'Average task rating';
  const contestsParticipated =
    asNumber(profile.contestCount) ?? profile.cpProfile.contests.length;
  const accountAgeDays =
    validDate(profile.accountCreatedAt) === null
      ? null
      : Math.max(0, Math.floor((now - validDate(profile.accountCreatedAt)) / DAY_MS));
  const topics = tags;
  const growthAnalysis = buildGrowthAnalysis(profile, solvedProblems, history);
  const implementationScore = buildImplementationScore(
    platform,
    profile,
    solvedProblems,
    topics,
  );
  const hardCount =
    platform === 'leetcode'
      ? asNumber(profile.dsaProfile.byDifficulty.hard) ?? 0
      : knownDifficulty.length
        ? knownDifficulty.filter((value) => value >= 1600).length
        : null;
  const currentRating = rating;
  const contestRanks = history
    .map((contest) => contest.rank)
    .filter((value) => value !== null);
  const dates = solvedProblems
    .map((problem) => validDate(problem.solvedAt))
    .filter((value) => value !== null);
  const recentSolved30 = activity.solved30;
  const recentSolved90 = activity.solved90;
  const paceScore30 = recentSolved30 === null ? null : Math.min(100, (recentSolved30 / 30) * 100);
  const paceScore90 = recentSolved90 === null ? null : Math.min(100, (recentSolved90 / 90) * 100);
  const weeklyTarget = recentSolved30 === null ? null : Math.max(3, Math.ceil(recentSolved30 / 4));
  const accountAgeLabel =
    accountAgeDays === null
      ? null
      : `${Math.floor(accountAgeDays / 365)}y ${Math.floor((accountAgeDays % 365) / 30)}m`;

  return {
    handle: profile.handle,
    currentRating,
    maxRating: peakRating,
    rankTitle: rank.title,
    rankColor: rank.color,
    totalSolved,
    averageDifficultyLabel,
    totalSolvedLabel:
      platform === 'leetcode'
        ? 'Total solved'
        : 'Solved in observed history',
    averageDifficulty: difficultyMean,
    contestsParticipated,
    submissionSuccessRate: submissions.successRate,
    submissions: {
      totalObserved: submissions.count,
      acceptedObserved: submissions.acceptedCount,
      attemptsPerSolved: submissions.attemptsPerSolved,
      averageSpeedMinutes: submissions.speedMinutes,
      speedSamples: submissions.speedSamples,
      preferredTimeOfDay: preferredSolvingTime(solvedProblems),
    },
    accountCreatedAt: profile.accountCreatedAt,
    accountAgeDays,
    accountAgeLabel,
    currentStreakDays: streaks.current,
    bestStreakDays: streaks.best,
    recentActivity: {
      solved30Days: recentSolved30,
      solved90Days: recentSolved90,
      paceScore30,
      paceScore90,
      active: recentSolved30 === null ? null : recentSolved30 > 0,
      weeklyTarget,
      dateSamples: activity.daysKnown,
    },
    averageContestRank: mean(contestRanks),
    bestContestRank: contestRanks.length ? Math.min(...contestRanks) : null,
    ratingHistory: history,
    skillGrowth: growth,
    contestPerformance: {
      averageRank: mean(contestRanks),
      bestRank: contestRanks.length ? Math.min(...contestRanks) : null,
      wins: 0,
      sharedContests: 0,
      winRate: null,
    },
    growthAnalysis,
    implementationScore,
    difficultyDistribution: buildDifficultyDistribution(platform, profile, solvedProblems),
    taskCategoryDistribution: buildTaskCategoryDistribution(platform, solvedProblems),
    topics,
    solvedProblems,
    hardCount,
    totalObservedSolves: solvedProblems.length,
    problemRatings: knownDifficulty,
    recentSubmissionCount: submissions.count,
    recentAcceptedCount: submissions.acceptedCount,
    recentContestChanges: historyChanges.slice(-3),
    derivedAverageContestChange: mean(historyChanges),
    observedSolveDates: dates,
    skillRarity: {
      value: null,
      populationPercentile: null,
      note: 'Population-wide rating percentiles are not exposed consistently by the public platform APIs.',
    },
    difficultyCoverage:
      platform !== 'atcoder'
        ? null
        : profile.problemModelError ??
          (knownDifficulty.length < solvedProblems.length
            ? `${knownDifficulty.length} of ${solvedProblems.length} observed solves had AtCoder model ratings.`
            : null),
  };
};

const relativePair = (first, second, higherIsBetter = true) => {
  if (first === null || second === null) return [null, null];
  if (first === second) return [50, 50];
  const firstValue = higherIsBetter ? first : -first;
  const secondValue = higherIsBetter ? second : -second;
  const low = Math.min(firstValue, secondValue);
  const high = Math.max(firstValue, secondValue);
  if (low >= 0) {
    const total = firstValue + secondValue;
    return [(firstValue / total) * 100, (secondValue / total) * 100];
  }
  const firstShare = ((firstValue - low) / (high - low)) * 100;
  return [firstShare, 100 - firstShare];
};

const makeBattle = (id, label, first, second, higherIsBetter = true) => {
  if (first === null || second === null) {
    return {
      id,
      label,
      firstValue: first,
      secondValue: second,
      firstShare: null,
      secondShare: null,
      winner: null,
      available: false,
    };
  }
  const [firstShare, secondShare] = relativePair(first, second, higherIsBetter);
  return {
    id,
    label,
    firstValue: first,
    secondValue: second,
    firstShare,
    secondShare,
    winner: first === second ? 'tie' : firstShare > secondShare ? 'first' : 'second',
    available: true,
  };
};

const makeTagBattles = (first, second) => {
  const firstTags = new Map(first.topics.map((topic) => [topic.tag.toLowerCase(), topic]));
  const secondTags = new Map(second.topics.map((topic) => [topic.tag.toLowerCase(), topic]));
  return [...new Set([...firstTags.keys(), ...secondTags.keys()])]
    .map((key) => {
      const left = firstTags.get(key);
      const right = secondTags.get(key);
      const leftSolved = left?.solved ?? 0;
      const rightSolved = right?.solved ?? 0;
      return {
        tag: left?.tag ?? right.tag,
        firstSolved: leftSolved,
        secondSolved: rightSolved,
        firstAverageRating: left?.averageRating ?? null,
        secondAverageRating: right?.averageRating ?? null,
        firstAccuracy: left?.accuracy ?? null,
        secondAccuracy: right?.accuracy ?? null,
        winner:
          leftSolved === rightSolved
            ? 'tie'
            : leftSolved > rightSolved
              ? 'first'
              : 'second',
      };
    })
    .sort(
      (left, right) =>
        Math.max(right.firstSolved, right.secondSolved) -
          Math.max(left.firstSolved, left.secondSolved) ||
        left.tag.localeCompare(right.tag),
    );
};

const makeSkillRadar = (first, second) => {
  const dimensions = [
    ['totalGrowth', 'Total Growth', true],
    ['momentum', 'Momentum', true],
    ['consistency', 'Consistency', true],
    ['peak', 'Peak Performance', true],
    ['stability', 'Stability', true],
    ['recentForm', 'Recent Form', true],
  ];
  const values = (user) => ({
    totalGrowth: user.skillGrowth.totalGrowth,
    momentum: user.skillGrowth.momentum,
    consistency: user.skillGrowth.consistencyPercent,
    peak: user.maxRating,
    stability:
      user.skillGrowth.volatility === null ? null : -user.skillGrowth.volatility,
    recentForm: user.skillGrowth.recentFormPercent,
  });
  const firstValues = values(first);
  const secondValues = values(second);
  return dimensions.map(([key, label, higher]) => {
    const [firstScore, secondScore] = relativePair(
      firstValues[key],
      secondValues[key],
      higher,
    );
    return { key, label, firstScore, secondScore };
  });
};

export const buildHeadToHeadComparison = (platform, profiles, now = Date.now()) => {
  const [first, second] = profiles.map((profile) =>
    summarizeProfile(platform, profile, now),
  );
  const contestWins = buildContestWins(first, second);
  first.contestPerformance = { ...first.contestPerformance, ...contestWins };
  second.contestPerformance = {
    ...second.contestPerformance,
    wins: contestWins.losses,
    losses: contestWins.wins,
    ties: contestWins.ties,
    sharedContests: contestWins.sharedContests,
    winRate: contestWins.sharedContests
      ? (contestWins.losses / contestWins.sharedContests) * 100
      : null,
  };

  const categories = [
    makeBattle(
      'problemSpeed',
      'Problem speed (minutes to accepted)',
      first.submissions.averageSpeedMinutes,
      second.submissions.averageSpeedMinutes,
      false,
    ),
    makeBattle(
      'currentStreak',
      'Current streak (days)',
      first.currentStreakDays,
      second.currentStreakDays,
    ),
    makeBattle(
      'bestStreak',
      'Best streak (observed history, days)',
      first.bestStreakDays,
      second.bestStreakDays,
    ),
    makeBattle(
      'recentActivity',
      'Recent activity (solves in 30 days)',
      first.recentActivity.solved30Days,
      second.recentActivity.solved30Days,
    ),
    makeBattle(
      'contestPerformance',
      'Contest performance (average rank)',
      first.contestPerformance.averageRank,
      second.contestPerformance.averageRank,
      false,
    ),
    makeBattle(
      'seniority',
      'Account seniority (days)',
      first.accountAgeDays,
      second.accountAgeDays,
    ),
  ];
  const availableBattles = categories.filter((battle) => battle.available);
  const firstWins = availableBattles.filter((battle) => battle.winner === 'first').length;
  const secondWins = availableBattles.filter((battle) => battle.winner === 'second').length;
  const ties = availableBattles.filter((battle) => battle.winner === 'tie').length;
  const categoryPoints = (wins) =>
    availableBattles.length
      ? ((wins + ties / 2) / availableBattles.length) * 100
      : null;
  first.compositeScore = categoryPoints(firstWins);
  second.compositeScore = categoryPoints(secondWins);
  first.categoriesWon = firstWins;
  second.categoriesWon = secondWins;
  first.categoriesTied = ties;
  second.categoriesTied = ties;
  first.categoriesAvailable = availableBattles.length;
  second.categoriesAvailable = availableBattles.length;
  const scoreLead =
    first.compositeScore === null || second.compositeScore === null
      ? null
      : Math.abs(first.compositeScore - second.compositeScore);
  const winnerIndex =
    scoreLead === null || scoreLead === 0
      ? null
      : first.compositeScore > second.compositeScore
        ? 0
        : 1;
  const loserScore =
    winnerIndex === null
      ? null
      : [first.compositeScore, second.compositeScore][1 - winnerIndex];
  return {
    platform,
    generatedAt: new Date(now).toISOString(),
    scoring: {
      method: 'Equal points across measurable category battles; ties count as half a point.',
      availableCategories: availableBattles.length,
      totalCategories: categories.length,
    },
    users: [first, second],
    categories,
    winner: {
      index: winnerIndex,
      handle: winnerIndex === null ? null : profiles[winnerIndex].handle,
      pointLead: scoreLead,
      percentAdvantage:
        winnerIndex === null || !loserScore
          ? null
          : (scoreLead / loserScore) * 100,
    },
    growth: {
      keyInsights: [
        first.skillGrowth.totalGrowth === null || second.skillGrowth.totalGrowth === null
          ? 'Contest rating growth is unavailable for one or both profiles.'
          : `${first.handle} grew ${Math.round(first.skillGrowth.totalGrowth)} points; ${second.handle} grew ${Math.round(second.skillGrowth.totalGrowth)} points over the available contest history.`,
        first.growthAnalysis.rate200 === null || second.growthAnalysis.rate200 === null
          ? 'Solve-time challenge rate requires dated solves with problem ratings.'
          : `${first.handle}: ${first.growthAnalysis.rate200.toFixed(1)}% of rated solves were 200+ points above the solve-time rating; ${second.handle}: ${second.growthAnalysis.rate200.toFixed(1)}%.`,
      ],
      radar: makeSkillRadar(first, second),
      contestHistory: [first.ratingHistory, second.ratingHistory],
    },
    implementation: [first.implementationScore, second.implementationScore],
    momentum: [first.recentActivity, second.recentActivity],
    skillValue: {
      formula: 'S(R) = -ln(1 - F(R))',
      available: false,
      explanation:
        'Population percentile F(R) is not published consistently by these public APIs, so rarity scores are not fabricated.',
    },
    tags: makeTagBattles(first, second),
    dataNotes: [
      'Recent submission and solve metrics are computed from the history each platform exposes to its public API.',
      platform === 'codeforces'
        ? 'Codeforces profile comparison uses up to the latest 1,000 public submissions; solve and attempt totals reflect that sample.'
        : platform === 'leetcode'
          ? 'LeetCode exposes aggregate solve counts, contest history, 20 recent accepted solves, and 50 recent submissions.'
            : 'AtCoder task counts use up to 500 submissions from the last 90 days. Difficulty buckets use the cached Kenkoooo problem-model dataset when available.',
      'Account age is available only when the platform exposes a registration timestamp.',
    ],
  };
};
