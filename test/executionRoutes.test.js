import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { AppError } from '../src/errors.js';
import { ExecutionService } from '../src/services/executionService.js';

test('execution endpoint requires a session and returns safe validation errors', async (t) => {
  const executionService = new ExecutionService({
    problemRepository: {
      getProblem: async (platform, problemId) => {
        if (platform === 'codeforces' && problemId === '4A') {
          return { title: 'Watermelon' };
        }
        throw new AppError('Problem not found.', {
          statusCode: 404,
          code: 'NOT_FOUND',
        });
      },
    },
    judgeClient: {
      submit: async () => ({
        status: 'Accepted',
        statusId: 3,
        stdout: 'YES\n',
        stderr: '',
        compileOutput: '',
        message: '',
        time: '0.01',
        memory: 1200,
      }),
    },
  });
  const authService = {
    authenticate: async (token) => {
      if (token !== 'valid-session') {
        throw new AppError('A valid session is required.', {
          statusCode: 401,
          code: 'UNAUTHORIZED',
        });
      }
      return { username: 'test_user', role: 'user' };
    },
  };
  const app = createApp({
    authService,
    executionService,
    profileService: { fetchProfile: async () => ({}), syncAll: async () => [] },
    userRepository: {},
  });
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/executions/run`;
  const payload = {
    platform: 'codeforces',
    problemId: 'missing',
    language: 'cpp',
    sourceCode: 'int main() {}',
    testCases: [{ input: '', expectedOutput: '' }],
  };
  const headers = { 'content-type': 'application/json' };

  const anonymous = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i);

  const unknownProblem = await fetch(baseUrl, {
    method: 'POST',
    headers: { ...headers, cookie: 'cpdsa_session=valid-session' },
    body: JSON.stringify(payload),
  });
  assert.equal(unknownProblem.status, 404);
  assert.deepEqual(await unknownProblem.json(), {
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Problem not found.' },
  });

  const successfulRun = await fetch(baseUrl, {
    method: 'POST',
    headers: { ...headers, cookie: 'cpdsa_session=valid-session' },
    body: JSON.stringify({
      ...payload,
      problemId: '4A',
      testCases: [{ input: '8\n', expectedOutput: 'YES\n' }],
    }),
  });
  assert.equal(successfulRun.status, 200);
  const runPayload = await successfulRun.json();
  assert.equal(runPayload.result.status, 'passed');
  assert.equal(runPayload.result.testCases[0].stdout, 'YES\n');

  const oversized = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...payload, sourceCode: 'x'.repeat(70 * 1024) }),
  });
  assert.equal(oversized.status, 413);
});
