import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyPlan } from '../src/services/weeklyPlan.js';

const makeProblem = (problemId, rating, tags = []) => ({
  platform: 'codeforces',
  problemId,
  title: problemId,
  rating,
  tags,
  reason: 'Curated for practice.',
});

test('prioritizes weak tags, orders by rating, and splits 100 problems into ten weeks', () => {
  const examples = [
    makeProblem('math-1', 900, ['math']),
    makeProblem('dp-2', 1200, ['dp']),
    makeProblem('other-1', 800, ['implementation']),
    makeProblem('dp-1', 1000, ['dp']),
    makeProblem('math-2', 1100, ['math']),
  ];

  const examplePlan = buildWeeklyPlan(examples, [{ tag: 'dp' }, { tag: 'math' }]);
  assert.deepEqual(
    examplePlan[0].problems.map((problem) => problem.problemId),
    ['dp-1', 'dp-2', 'math-1', 'math-2', 'other-1'],
  );
  assert.deepEqual(examplePlan[0].focusTags, ['dp', 'math']);

  const fullPlan = buildWeeklyPlan(
    Array.from({ length: 100 }, (_, index) =>
      makeProblem(`problem-${index}`, 800 + index * 10, ['dp']),
    ),
    [{ tag: 'dp' }],
  );
  assert.equal(fullPlan.length, 10);
  assert.deepEqual(
    fullPlan.map((week) => week.problems.length),
    Array(10).fill(10),
  );
});

test('deduplicates problems and leaves later weeks empty when fewer than 100 are eligible', () => {
  const problems = [
    makeProblem('first', 800, ['greedy']),
    makeProblem('first', 800, ['greedy']),
    makeProblem('second', null, ['math']),
  ];
  const plan = buildWeeklyPlan(problems, []);

  assert.deepEqual(plan.map((week) => week.problems.length), [2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(
    plan[0].problems.map((problem) => problem.problemId),
    ['first', 'second'],
  );
});
