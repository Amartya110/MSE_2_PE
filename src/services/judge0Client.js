import { UpstreamError } from '../errors.js';

const decodeBase64 = (value) =>
  value ? Buffer.from(value, 'base64').toString('utf8') : '';
const MAX_JUDGE0_RESPONSE_BYTES = 1024 * 1024;

const readBoundedJson = async (response) => {
  if (!response.body) {
    throw new UpstreamError('Judge0 returned an empty response.');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_JUDGE0_RESPONSE_BYTES) {
      await reader.cancel();
      throw new UpstreamError('Judge0 response exceeded the size limit.');
    }
    chunks.push(Buffer.from(value));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (cause) {
    throw new UpstreamError('Judge0 returned invalid JSON.', { cause });
  }
};

export class Judge0Client {
  constructor({
    apiUrl = process.env.JUDGE0_API_URL ?? 'https://ce.judge0.com',
    apiKey = process.env.JUDGE0_API_KEY,
    fetchImpl = fetch,
    pollIntervalMs = 500,
    pollTimeoutMs = 12000,
  } = {}) {
    let parsedUrl;
    try {
      parsedUrl = new URL(apiUrl);
    } catch {
      throw new Error('JUDGE0_API_URL must be an absolute URL.');
    }

    const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(
      parsedUrl.hostname,
    );
    if (
      parsedUrl.username ||
      parsedUrl.password ||
      parsedUrl.search ||
      parsedUrl.hash ||
      (parsedUrl.protocol !== 'https:' &&
        !(parsedUrl.protocol === 'http:' && isLoopback))
    ) {
      throw new Error(
        'JUDGE0_API_URL must use HTTPS and cannot include credentials or query parameters (HTTP is allowed only for loopback development).',
      );
    }
    if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 100) {
      throw new Error('Judge0 poll interval must be at least 100ms.');
    }
    if (!Number.isInteger(pollTimeoutMs) || pollTimeoutMs < 1000) {
      throw new Error('Judge0 poll timeout must be at least 1000ms.');
    }

    this.apiUrl = parsedUrl.toString().replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.pollIntervalMs = pollIntervalMs;
    this.pollTimeoutMs = pollTimeoutMs;
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    timeout.unref?.();

    try {
      const response = await this.fetchImpl(`${this.apiUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          ...(this.apiKey ? { 'X-Auth-Token': this.apiKey } : {}),
          ...options.headers,
        },
      });
      if (!response.ok) {
        throw new UpstreamError(
          `Judge0 returned HTTP ${response.status}.`,
        );
      }
      return readBoundedJson(response);
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      throw new UpstreamError(
        error.name === 'AbortError'
          ? 'Judge0 request timed out.'
          : `Judge0 request failed: ${error.message}`,
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async submit({ sourceCode, languageId, stdin }) {
    const created = await this.request(
      '/submissions?base64_encoded=true&wait=false',
      {
        method: 'POST',
        body: JSON.stringify({
          source_code: Buffer.from(sourceCode, 'utf8').toString('base64'),
          language_id: languageId,
          stdin: Buffer.from(stdin, 'utf8').toString('base64'),
          cpu_time_limit: 2,
          cpu_extra_time: 1,
          wall_time_limit: 5,
          memory_limit: 128000,
          stack_limit: 64000,
          max_file_size: 1024,
          redirect_stderr_to_stdout: false,
        }),
      },
    );
    if (typeof created.token !== 'string' || !created.token) {
      throw new UpstreamError('Judge0 did not return a submission token.');
    }

    const deadline = Date.now() + this.pollTimeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      const result = await this.request(
        `/submissions/${encodeURIComponent(created.token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,message,time,memory`,
      );
      if (!result.status || typeof result.status.id !== 'number') {
        throw new UpstreamError('Judge0 returned an invalid execution result.');
      }
      if (result.status.id > 2) {
        return {
          status: result.status.description ?? 'Finished',
          statusId: result.status.id,
          stdout: decodeBase64(result.stdout),
          stderr: decodeBase64(result.stderr),
          compileOutput: decodeBase64(result.compile_output),
          message: decodeBase64(result.message),
          time: result.time ?? null,
          memory: result.memory ?? null,
        };
      }
    }

    return {
      status: 'Timed out waiting for Judge0',
      statusId: 0,
      stdout: '',
      stderr: '',
      compileOutput: '',
      message: 'The sandbox did not finish before the polling deadline.',
      time: null,
      memory: null,
    };
  }
}
