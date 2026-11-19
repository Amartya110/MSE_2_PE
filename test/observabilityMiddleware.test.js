import test from 'node:test';
import assert from 'node:assert/strict';
import { observabilityMiddleware } from '../store/observabilityMiddleware.js';

test('execution telemetry records summary fields without source or test data', () => {
  const originalInfo = console.info;
  const events = [];
  console.info = (line) => events.push(JSON.parse(line));
  try {
    const middleware = observabilityMiddleware({
      getState: () => ({ editor: { problem: null } }),
    });
    const action = {
      type: 'editor/run/fulfilled',
      meta: { requestId: 'request-1' },
      payload: {
        runId: 'run-1',
        platform: 'leetcode',
        problemId: 'two-sum',
        language: 'python',
        status: 'passed',
        durationMs: 120,
        sourceCode: 'private source',
        testCases: [{ input: 'private input', stdout: 'private output' }],
      },
    };

    middleware(() => (receivedAction) => receivedAction)(action);

    assert.deepEqual(events, [{
      event: 'execution.completed',
      requestId: 'request-1',
      runId: 'run-1',
      platform: 'leetcode',
      problemId: 'two-sum',
      language: 'python',
      status: 'passed',
      durationMs: 120,
    }]);
    assert.equal(JSON.stringify(events).includes('private'), false);
  } finally {
    console.info = originalInfo;
  }
});
