import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ExecutionService,
  SUPPORTED_LANGUAGES,
} from '../src/services/executionService.js';
import { Judge0Client } from '../src/services/judge0Client.js';

test('execution validates, streams a private temp source file, and returns bounded per-case results', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'cpdsa-test-root-'));
  const submitted = [];
  const service = new ExecutionService({
    tempRoot,
    problemRepository: {
      getProblem: async (platform, problemId) => ({
        platform,
        problemId,
        title: 'Watermelon',
      }),
    },
    judgeClient: {
      submit: async (submission) => {
        submitted.push(submission);
        return {
          status: 'Accepted',
          statusId: 3,
          stdout: 'YES\r\n',
          stderr: '',
          compileOutput: '',
          message: '',
          time: '0.01',
          memory: 1200,
        };
      },
    },
  });

  try {
    const result = await service.run({
      platform: 'codeforces',
      problemId: '4A',
      language: 'cpp',
      sourceCode: '#include <iostream>\nint main() { std::cout << "YES"; }\n',
      testCases: [
        { input: '8\n', expectedOutput: 'YES\n' },
        { input: '', expectedOutput: '' },
      ],
    });

    assert.equal(result.status, 'executed');
    assert.equal(result.testCases.length, 2);
    assert.equal(result.testCases[0].outcome, 'passed');
    assert.equal(submitted[0].languageId, SUPPORTED_LANGUAGES.cpp.judge0Id);
    assert.equal(submitted[0].sourceCode.includes('std::cout'), true);
    assert.deepEqual(await readdir(tempRoot), []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('execution rejects unsupported languages, unknown problems, and oversized input before Judge0', async () => {
  let judgeCalls = 0;
  const service = new ExecutionService({
    problemRepository: {
      getProblem: async () => {
        throw Object.assign(new Error('Problem not found.'), { statusCode: 404 });
      },
    },
    judgeClient: {
      submit: async () => {
        judgeCalls += 1;
        throw new Error('Must not execute.');
      },
    },
  });
  const valid = {
    platform: 'codeforces',
    problemId: '4A',
    language: 'cpp',
    sourceCode: 'int main() {}',
    testCases: [{ input: '8', expectedOutput: 'YES' }],
  };

  await assert.rejects(
    service.run({ ...valid, language: 'bash' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    service.run({ ...valid, sourceCode: 'x'.repeat(20 * 1024 + 1) }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(service.run(valid), { statusCode: 404 });
  assert.equal(judgeCalls, 0);
});

test('Judge0 client accepts only secure service URLs and decodes base64 results', async () => {
  assert.throws(
    () => new Judge0Client({ apiUrl: 'http://example.com' }),
    /must use HTTPS/,
  );
  assert.throws(
    () => new Judge0Client({ apiUrl: 'https://user:pass@example.com' }),
    /cannot include credentials/,
  );

  const requests = [];
  const client = new Judge0Client({
    apiUrl: 'http://localhost:2358',
    pollIntervalMs: 100,
    pollTimeoutMs: 1000,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/submissions?base64_encoded=true&wait=false')) {
        return new Response(JSON.stringify({ token: 'safe-token' }), {
          status: 201,
        });
      }
      return new Response(
        JSON.stringify({
          status: { id: 3, description: 'Accepted' },
          stdout: Buffer.from('ok\n').toString('base64'),
          stderr: '',
          compile_output: '',
          message: '',
        }),
        { status: 200 },
      );
    },
  });
  const result = await client.submit({
    sourceCode: 'print("ok")',
    languageId: 71,
    stdin: '',
  });
  assert.equal(result.stdout, 'ok\n');
  assert.equal(requests.length, 2);
  const body = JSON.parse(requests[0].options.body);
  assert.equal(Buffer.from(body.source_code, 'base64').toString(), 'print("ok")');
  assert.equal(body.cpu_time_limit, 2);
});
