import { Buffer } from 'node:buffer';
import { config } from '../config.js';
import { UpstreamError } from '../errors.js';

export class BasePlatformClient {
  constructor(platform, { timeoutMs = config.requestTimeoutMs } = {}) {
    this.platform = platform;
    this.timeoutMs = timeoutMs;
  }

  async fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref?.();

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'UnifiedCPDSATracker/1.0',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new UpstreamError(
          `${this.platform} returned HTTP ${response.status}.`,
        );
      }

      const body = Buffer.from(await response.arrayBuffer());
      if (body.byteLength > config.maxUpstreamResponseBytes) {
        throw new UpstreamError(`${this.platform} response exceeded the size limit.`);
      }

      try {
        return JSON.parse(body.toString('utf8'));
      } catch (cause) {
        throw new UpstreamError(`${this.platform} returned invalid JSON.`, {
          cause,
        });
      }
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      if (error.name === 'AbortError') {
        throw new UpstreamError(`${this.platform} request timed out.`, {
          cause: error,
        });
      }
      throw new UpstreamError(`${this.platform} request failed: ${error.message}`, {
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
