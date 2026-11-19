import { AtCoderClient } from './atcoderClient.js';
import { CodeChefClient } from './codechefClient.js';
import { CodeforcesClient } from './codeforcesClient.js';
import { LeetCodeClient } from './leetcodeClient.js';

export const createPlatformClients = () => ({
  codeforces: new CodeforcesClient(),
  leetcode: new LeetCodeClient(),
  codechef: new CodeChefClient(),
  atcoder: new AtCoderClient(),
});
