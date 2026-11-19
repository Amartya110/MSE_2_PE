import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/db.js';
import { Problem } from '../src/models/problem.js';
import { problemCatalog } from '../data/problemCatalog.js';

const seedProblemBank = async () => {
  await connectDatabase();

  try {
    const operations = problemCatalog.map((problem) => ({
      updateOne: {
        filter: {
          platform: problem.platform,
          problemId: problem.problemId,
        },
        update: {
          $setOnInsert: {
            platform: problem.platform,
            problemId: problem.problemId,
            title: problem.title,
            rating: problem.rating,
            tags: problem.tags,
            difficulty: problem.difficulty,
            url: problem.url,
            statement: problem.statement,
            sampleTestCases: problem.sampleTestCases,
          },
        },
        upsert: true,
      },
    }));

    const result = await Problem.bulkWrite(operations, { ordered: false });
    console.log(JSON.stringify({
      event: 'problem_bank.seeded',
      attempted: operations.length,
      inserted: result.upsertedCount,
      alreadyPresent: result.matchedCount,
    }));
  } finally {
    await disconnectDatabase();
  }
};

seedProblemBank().catch((error) => {
  console.error(JSON.stringify({
    event: 'problem_bank.seed_failed',
    errorName: error.name ?? 'Error',
    errorCode: error.code ?? 'SEED_FAILED',
  }));
  process.exitCode = 1;
});
