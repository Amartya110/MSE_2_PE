import { EventEmitter } from 'node:events';
import { normalizeProfile } from '../normalization/profileNormalizer.js';
import {
  normalizeUsername,
  parsePlatformAndHandle,
  validateHandles,
} from '../validation.js';
import { ValidationError } from '../errors.js';
import { buildHeadToHeadComparison } from './compareEngine.js';

const LIVE_COMPARISON_PLATFORMS = new Set([
  'codeforces',
  'leetcode',
  'atcoder',
]);

export const createProfileService = ({
  clients,
  profileCache,
  logger,
  userRepository,
}) => {
  const events = new EventEmitter();

  events.on('profile:synced', (profile) => {
    logger
      .log({
        event: 'profile:synced',
        platform: profile.platform,
        handle: profile.handle,
        solvedCount: profile.dsaProfile.totalSolved,
      })
      .catch((error) => {
        console.error('Failed to write profile sync event log:', error);
      });
  });

  const fetchProfile = async (platform, handle, username = handle) => {
    const request = parsePlatformAndHandle(platform, handle, clients);
    const owner = normalizeUsername(username);
    const rawProfile = await clients[request.platform].fetchProfile(request.handle);
    const profile = normalizeProfile(request.platform, rawProfile);
    await userRepository.upsertSyncedProfile(owner, request.handle, profile);
    await profileCache.write(profile);
    events.emit('profile:synced', profile);
    return profile;
  };

  const syncAll = async (handles, username) => {
    const requests = validateHandles(handles, clients);
    const owner = normalizeUsername(username ?? requests[0].handle);
    await userRepository.upsertPlatformHandles(
      owner,
      Object.fromEntries(requests.map(({ platform, handle }) => [platform, handle])),
    );
    return Promise.all(
      requests.map(async ({ platform, handle }) => {
        try {
          return {
            platform,
            handle,
            ok: true,
            profile: await fetchProfile(platform, handle, owner),
          };
        } catch (error) {
          return {
            platform,
            handle,
            ok: false,
            error: { code: error.code ?? 'SYNC_FAILED', message: error.message },
          };
        }
      }),
    );
  };

  const comparePlatformUsers = async ({ platform, firstHandle, secondHandle }) => {
    if (!LIVE_COMPARISON_PLATFORMS.has(platform)) {
      throw new ValidationError(
        'Live comparison supports Codeforces, LeetCode, and AtCoder.',
      );
    }

    const first = parsePlatformAndHandle(platform, firstHandle, clients);
    const second = parsePlatformAndHandle(platform, secondHandle, clients);
    if (first.handle.toLowerCase() === second.handle.toLowerCase()) {
      throw new ValidationError('Choose two different platform handles.');
    }

    const [firstRaw, secondRaw] = await Promise.all([
      clients[platform].fetchProfile(first.handle),
      clients[platform].fetchProfile(second.handle),
    ]);

    const profiles = [
      normalizeProfile(platform, firstRaw),
      normalizeProfile(platform, secondRaw),
    ];
    return buildHeadToHeadComparison(platform, profiles);
  };

  return {
    fetchProfile,
    syncAll,
    comparePlatformUsers,
    events,
  };
};
