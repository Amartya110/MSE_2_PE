import { BasePlatformClient } from './basePlatformClient.js';
import { config } from '../config.js';
import { UpstreamError } from '../errors.js';

export class CodeChefClient extends BasePlatformClient {
  constructor(options) {
    super('CodeChef', options);
    this.baseUrl = config.codeChefApiBaseUrl.replace(/\/+$/, '');
  }

  async fetchProfile(handle) {
    let result;
    try {
      result = await this.fetchJson(
        `${this.baseUrl}/${encodeURIComponent(handle)}`,
      );
    } catch (error) {
      if (error instanceof UpstreamError && error.message.includes('HTTP 402')) {
        throw new UpstreamError(
          'The configured CodeChef data provider returned HTTP 402 (payment required). The handle was saved, but profile statistics are unavailable.',
          { cause: error },
        );
      }
      throw error;
    }
    if (result.success === false || result.status === 'error') {
      throw new UpstreamError(
        result.message ?? 'CodeChef profile was not available.',
      );
    }

    return {
      platform: this.platform,
      handle,
      profile: result,
      contests: Array.isArray(result.ratingData) ? result.ratingData : [],
      solvedProblems: Array.isArray(result.solvedProblems)
        ? result.solvedProblems
        : [],
      recentSubmissions: Array.isArray(result.recentSubmissions)
        ? result.recentSubmissions
        : [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
