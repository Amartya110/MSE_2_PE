import { BasePlatformClient } from './basePlatformClient.js';
import { UpstreamError } from '../errors.js';

const GRAPHQL_URL = 'https://leetcode.com/graphql';
const PROFILE_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStats {
        acSubmissionNum { difficulty count submissions }
      }
      tagProblemCounts {
        advanced { tagName tagSlug problemsSolved }
        intermediate { tagName tagSlug problemsSolved }
        fundamental { tagName tagSlug problemsSolved }
      }
    }
    userContestRanking(username: $username) {
      rating
      globalRanking
      attendedContestsCount
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      contest { title startTime }
    }
    recentAcSubmissionList(username: $username, limit: 20) {
      title
      titleSlug
      timestamp
    }
    recentSubmissions: recentSubmissionList(username: $username, limit: 50) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

export class LeetCodeClient extends BasePlatformClient {
  constructor(options) {
    super('LeetCode', options);
  }

  async fetchProfile(handle) {
    const result = await this.fetchJson(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: PROFILE_QUERY,
        variables: { username: handle },
      }),
    });

    if (result.errors?.length || !result.data?.matchedUser) {
      throw new UpstreamError(
        result.errors?.[0]?.message ?? 'LeetCode profile was not found.',
      );
    }

    return {
      platform: this.platform,
      handle,
      profile: result.data.matchedUser,
      contest: result.data.userContestRanking ?? null,
      contestHistory: result.data.userContestRankingHistory ?? [],
      recentAccepted: result.data.recentAcSubmissionList ?? [],
      recentSubmissions: result.data.recentSubmissions ?? [],
      fetchedAt: new Date().toISOString(),
    };
  }
}
