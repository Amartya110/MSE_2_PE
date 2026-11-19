import { BasePlatformClient } from './basePlatformClient.js';
import { UpstreamError } from '../errors.js';

const ATCODER_BASE = 'https://atcoder.jp';
const ATCODER_PROBLEMS_API = 'https://kenkoooo.com/atcoder/atcoder-api/v3';
const ATCODER_PROBLEM_MODELS =
  'https://kenkoooo.com/atcoder/resources/problem-models.json';
const PROBLEM_MODELS_CACHE_MS = 24 * 60 * 60 * 1000;

export class AtCoderClient extends BasePlatformClient {
  constructor(options) {
    super('AtCoder', options);
    this.problemModelsPromise = null;
    this.problemModelsExpiresAt = 0;
    this.kenkooooQueue = Promise.resolve();
    this.lastKenkooooRequestAt = 0;
  }

  fetchKenkooooJson(url) {
    const request = this.kenkooooQueue.then(async () => {
      const waitMs = Math.max(
        0,
        1000 - (Date.now() - this.lastKenkooooRequestAt),
      );
      if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
      try {
        return await this.fetchJson(url);
      } finally {
        this.lastKenkooooRequestAt = Date.now();
      }
    });
    this.kenkooooQueue = request.catch(() => {});
    return request;
  }

  async fetchProblemModels() {
    if (
      this.problemModelsPromise &&
      Date.now() < this.problemModelsExpiresAt
    ) {
      return this.problemModelsPromise;
    }

    this.problemModelsExpiresAt = Number.POSITIVE_INFINITY;
    this.problemModelsPromise = this.fetchKenkooooJson(ATCODER_PROBLEM_MODELS).then(
      (models) => {
        if (!models || typeof models !== 'object' || Array.isArray(models)) {
          throw new UpstreamError(
            'AtCoder returned an unexpected problem-model response.',
          );
        }
        this.problemModelsExpiresAt = Date.now() + PROBLEM_MODELS_CACHE_MS;
        return models;
      },
    );
    try {
      return await this.problemModelsPromise;
    } catch (error) {
      this.problemModelsPromise = null;
      this.problemModelsExpiresAt = 0;
      throw error;
    }
  }

  async fetchProfile(handle) {
    const encodedHandle = encodeURIComponent(handle);
    const submissionWindowStart =
      Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const [history, submissions] = await Promise.all([
      this.fetchJson(`${ATCODER_BASE}/users/${encodedHandle}/history/json`),
      this.fetchKenkooooJson(
        `${ATCODER_PROBLEMS_API}/user/submissions?user=${encodedHandle}&from_second=${submissionWindowStart}`,
      ),
    ]);

    if (!Array.isArray(history) || !Array.isArray(submissions)) {
      throw new UpstreamError('AtCoder returned an unexpected profile response.');
    }

    let problemModels = null;
    let problemModelError = null;
    try {
      problemModels = await this.fetchProblemModels();
    } catch (error) {
      if (!(error instanceof UpstreamError)) throw error;
      problemModelError = error.message;
    }

    return {
      platform: this.platform,
      handle,
      contests: history,
      submissions,
      problemModels,
      problemModelError,
      submissionWindowStart,
      submissionLimit: 500,
      fetchedAt: new Date().toISOString(),
    };
  }
}
