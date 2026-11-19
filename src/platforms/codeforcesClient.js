import { BasePlatformClient } from './basePlatformClient.js';
import { UpstreamError } from '../errors.js';

const API_BASE = 'https://codeforces.com/api';

export class CodeforcesClient extends BasePlatformClient {
  constructor(options) {
    super('Codeforces', options);
  }

  async fetchProfile(handle) {
    const encodedHandle = encodeURIComponent(handle);
    const [info, ratings, submissions] = await Promise.all([
      this.fetchJson(`${API_BASE}/user.info?handles=${encodedHandle}`),
      this.fetchJson(`${API_BASE}/user.rating?handle=${encodedHandle}`),
      this.fetchJson(`${API_BASE}/user.status?handle=${encodedHandle}&from=1&count=1000`),
    ]);

    for (const result of [info, ratings, submissions]) {
      if (result.status !== 'OK') {
        throw new UpstreamError(
          `Codeforces API error: ${result.comment ?? 'request was unsuccessful'}.`,
        );
      }
    }

    return {
      platform: this.platform,
      handle,
      profile: info.result[0] ?? {},
      contests: ratings.result ?? [],
      submissions: submissions.result ?? [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
