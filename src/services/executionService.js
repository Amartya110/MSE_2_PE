import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppError, ValidationError } from '../errors.js';
import { PLATFORMS } from '../validation.js';

export const SUPPORTED_LANGUAGES = Object.freeze({
  cpp: { label: 'C++17', judge0Id: 54, extension: '.cpp' },
  python: { label: 'Python 3', judge0Id: 71, extension: '.py' },
  java: { label: 'Java 17', judge0Id: 62, extension: '.java' },
  javascript: { label: 'JavaScript (Node.js)', judge0Id: 63, extension: '.js' },
});

const MAX_SOURCE_BYTES = 20 * 1024;
const MAX_TESTS = 3;
const MAX_TEST_INPUT_BYTES = 4096;
const MAX_TOTAL_TEST_BYTES = 12 * 1024;
const MAX_OUTPUT_BYTES = 16 * 1024;
const MAX_RUN_TIMEOUT_MS = 25000;

const normalizeOutput = (output) => output.replace(/\r\n/g, '\n').trim();

const compareTestCase = (result, expectedOutput) => {
  if (result.statusId !== 3) return result.status.toLowerCase();
  if (!expectedOutput) return 'executed';
  return normalizeOutput(result.stdout) === normalizeOutput(expectedOutput)
    ? 'passed'
    : 'failed';
};

const bounded = (value) => {
  const buffer = Buffer.from(value ?? '', 'utf8');
  if (buffer.byteLength <= MAX_OUTPUT_BYTES) return buffer.toString('utf8');
  return `${buffer.subarray(0, MAX_OUTPUT_BYTES).toString('utf8')}\n[output truncated]`;
};

export class ExecutionService {
  constructor({ judgeClient, problemRepository, tempRoot }) {
    this.judgeClient = judgeClient;
    this.problemRepository = problemRepository;
    this.tempRoot = tempRoot;
  }

  validateRequest(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError('Execution request must be a JSON object.');
    }
    const { platform, problemId, language, sourceCode, testCases } = payload;
    if (!PLATFORMS.includes(platform)) {
      throw new ValidationError('Unsupported problem platform.');
    }
    if (
      typeof problemId !== 'string' ||
      problemId.length < 1 ||
      problemId.length > 200
    ) {
      throw new ValidationError('problemId must be 1-200 characters.');
    }
    if (!Object.hasOwn(SUPPORTED_LANGUAGES, language)) {
      throw new ValidationError('Select C++, Python, Java, or JavaScript.');
    }
    if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
      throw new ValidationError('Source code is required.');
    }
    if (Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_BYTES) {
      throw new ValidationError('Source code must be 20 KB or smaller.');
    }
    if (
      !Array.isArray(testCases) ||
      testCases.length < 1 ||
      testCases.length > MAX_TESTS ||
      testCases.some(
        (testCase) =>
          !testCase ||
          typeof testCase.input !== 'string' ||
          typeof testCase.expectedOutput !== 'string' ||
          Buffer.byteLength(testCase.input, 'utf8') > MAX_TEST_INPUT_BYTES ||
          Buffer.byteLength(testCase.expectedOutput, 'utf8') >
            MAX_TEST_INPUT_BYTES,
      )
    ) {
      throw new ValidationError(
        'Provide 1-3 test cases; each input and expected output must be a string no larger than 4096 bytes.',
      );
    }
    const totalBytes = testCases.reduce(
      (total, testCase) =>
        total +
        Buffer.byteLength(testCase.input, 'utf8') +
        Buffer.byteLength(testCase.expectedOutput, 'utf8'),
      0,
    );
    if (totalBytes > MAX_TOTAL_TEST_BYTES) {
      throw new ValidationError('Combined test data must be 12 KB or smaller.');
    }
    return {
      platform,
      problemId,
      language,
      sourceCode,
      testCases: testCases.map((testCase) => ({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
      })),
    };
  }

  async prepareSourceFile(language, sourceCode) {
    const details = SUPPORTED_LANGUAGES[language];
    const prefix = join(this.tempRoot ?? tmpdir(), 'cpdsa-run-');
    const directory = await mkdtemp(prefix);
    try {
      const sourcePath = join(directory, `${randomUUID()}${details.extension}`);
      await writeFile(sourcePath, Buffer.from(sourceCode, 'utf8'), {
        flag: 'wx',
        mode: 0o600,
      });

      const chunks = [];
      for await (const chunk of createReadStream(sourcePath, {
        highWaterMark: 4096,
      })) {
        chunks.push(Buffer.from(chunk));
      }
      return { directory, sourceCode: Buffer.concat(chunks).toString('utf8') };
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  async run(payload) {
    const input = this.validateRequest(payload);
    const problem = await this.problemRepository.getProblem(
      input.platform,
      input.problemId,
    );
    const prepared = await this.prepareSourceFile(input.language, input.sourceCode);

    try {
      const startedAt = Date.now();
      const cases = await Promise.all(
        input.testCases.map(async (testCase, index) => {
          const result = await this.judgeClient.submit({
            sourceCode: prepared.sourceCode,
            languageId: SUPPORTED_LANGUAGES[input.language].judge0Id,
            stdin: testCase.input,
          });
          return {
            index,
            status: result.status,
            outcome: compareTestCase(result, testCase.expectedOutput),
            stdout: bounded(result.stdout),
            stderr: bounded(result.stderr),
            compileOutput: bounded(result.compileOutput),
            message: bounded(result.message),
            expectedOutput: bounded(testCase.expectedOutput),
            time: result.time,
            memory: result.memory,
          };
        }),
      );
      return {
        runId: randomUUID(),
        platform: input.platform,
        problemId: input.problemId,
        problemTitle: problem.title,
        language: input.language,
        languageLabel: SUPPORTED_LANGUAGES[input.language].label,
        status: cases.every((testCase) => testCase.outcome === 'passed')
          ? 'passed'
          : cases.some((testCase) => testCase.outcome === 'executed')
            ? 'executed'
            : 'needs-attention',
        durationMs: Date.now() - startedAt,
        testCases: cases,
      };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new AppError('Code execution could not be completed.', {
        statusCode: 502,
        code: 'EXECUTION_FAILED',
      });
    } finally {
      await rm(prepared.directory, { recursive: true, force: true });
    }
  }
}
