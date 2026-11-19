const WEEK_COUNT = 10;
const PROBLEMS_PER_WEEK = 10;
const MAX_PLAN_PROBLEMS = WEEK_COUNT * PROBLEMS_PER_WEEK;

const getTagName = (tag) =>
  typeof tag === 'string' ? tag : typeof tag?.tag === 'string' ? tag.tag : '';

const ratingValue = (problem) => {
  if (
    problem.rating === null ||
    problem.rating === undefined ||
    problem.rating === ''
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const rating = Number(problem.rating);
  return Number.isFinite(rating) ? rating : Number.POSITIVE_INFINITY;
};

export const buildWeeklyPlan = (problems = [], weakTags = []) => {
  const weakTagOrder = new Map(
    weakTags
      .map(getTagName)
      .filter(Boolean)
      .map((tag, index) => [tag.toLowerCase(), index]),
  );
  const uniqueProblems = [
    ...new Map(
      problems.map((problem) => [
        `${problem.platform}:${problem.problemId}`,
        problem,
      ]),
    ).values(),
  ];
  const prioritizedProblems = uniqueProblems
    .map((problem) => {
      const tags = Array.isArray(problem.tags) ? problem.tags : [];
      const matchingTags = tags.filter((tag) =>
        weakTagOrder.has(String(tag).toLowerCase()),
      );
      const priority = matchingTags.length
        ? Math.min(...matchingTags.map((tag) => weakTagOrder.get(String(tag).toLowerCase())))
        : Number.MAX_SAFE_INTEGER;
      return { problem, priority, matchingTags };
    })
    .sort(
      (left, right) =>
        left.priority - right.priority ||
        ratingValue(left.problem) - ratingValue(right.problem) ||
        left.problem.platform.localeCompare(right.problem.platform) ||
        left.problem.problemId.localeCompare(right.problem.problemId),
    )
    .slice(0, MAX_PLAN_PROBLEMS);

  return Array.from({ length: WEEK_COUNT }, (_, index) => {
    const weekProblems = prioritizedProblems
      .slice(index * PROBLEMS_PER_WEEK, (index + 1) * PROBLEMS_PER_WEEK)
      .map(({ problem }, problemIndex) => ({
        ...problem,
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        position: problemIndex + 1,
      }));
    const tagCounts = new Map();
    weekProblems.forEach((problem) => {
      [...new Set(problem.tags)].forEach((tag) => {
        const normalizedTag = String(tag).toLowerCase();
        if (weakTagOrder.has(normalizedTag)) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      });
    });
    const focusTags = [...tagCounts.entries()]
      .sort(
        (left, right) =>
          right[1] - left[1] ||
          weakTagOrder.get(String(left[0]).toLowerCase()) -
            weakTagOrder.get(String(right[0]).toLowerCase()),
      )
      .slice(0, 3)
      .map(([tag]) => tag);

    return {
      week: index + 1,
      focusTags,
      problems: weekProblems,
    };
  });
};
