import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/db.js';
import { Problem } from '../src/models/problem.js';

const API_URL = 'https://codeforces.com/api/problemset.problems';
const BATCH_SIZE = 500;

const mapProblem = (problem) => {
  if (
    !Number.isInteger(problem.contestId) ||
    typeof problem.index !== 'string' ||
    !problem.index ||
    typeof problem.name !== 'string' ||
    !Number.isFinite(problem.rating) ||
    !Array.isArray(problem.tags)
  ) {
    return null;
  }

  const difficulty =
    problem.rating < 1200
      ? 'Easy'
      : problem.rating < 1600
        ? 'Medium'
        : problem.rating < 2000
          ? 'Hard'
          : 'Expert';

  return {
    platform: 'codeforces',
    problemId: `${problem.contestId}-${problem.index}`,
    title: problem.name,
    rating: problem.rating,
    tags: problem.tags,
    difficulty,
    url: `https://codeforces.com/problemset/problem/${problem.contestId}/${encodeURIComponent(problem.index)}`,
  };
};

const importProblems = async () => {
  const response = await fetch(API_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Codeforces returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.status !== 'OK' || !Array.isArray(payload.result?.problems)) {
    throw new Error('Codeforces returned an invalid problemset response.');
  }

  const problems = payload.result.problems.map(mapProblem).filter(Boolean);
  if (problems.length === 0) {
    throw new Error('Codeforces returned no rated problems to import.');
  }

  await connectDatabase();
  try {
    let inserted = 0;
    let alreadyPresent = 0;

    for (let offset = 0; offset < problems.length; offset += BATCH_SIZE) {
      const batch = problems.slice(offset, offset + BATCH_SIZE);
      const result = await Problem.bulkWrite(
        batch.map((problem) => ({
          updateOne: {
            filter: {
              platform: problem.platform,
              problemId: problem.problemId,
            },
            update: { $setOnInsert: problem },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      inserted += result.upsertedCount;
      alreadyPresent += result.matchedCount;
    }

    console.log(JSON.stringify({
      event: 'problem_bank.codeforces_imported',
      attempted: problems.length,
      inserted,
      alreadyPresent,
    }));
  } finally {
    await disconnectDatabase();
  }
};

importProblems().catch((error) => {
  console.error(JSON.stringify({
    event: 'problem_bank.codeforces_import_failed',
    errorName: error.name ?? 'Error',
    errorCode: error.code ?? 'IMPORT_FAILED',
  }));
  process.exitCode = 1;
});
