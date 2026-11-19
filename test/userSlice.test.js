import test from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import userReducer, { syncProfiles } from '../store/userSlice.js';

test('all-failed sync still loads the profile containing saved handles', async () => {
  const originalFetch = globalThis.fetch;
  const profile = {
    username: 'tracker_user',
    platformHandles: { codechef: 'chef_handle' },
  };
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Response(
        JSON.stringify({
          synced: 0,
          failed: 1,
          results: [
            {
              platform: 'codechef',
              handle: 'chef_handle',
              ok: false,
              error: { message: 'Provider returned HTTP 402.' },
            },
          ],
        }),
        { status: 207, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ user: profile }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const store = configureStore({
      reducer: {
        user: userReducer,
        auth: () => ({ account: { username: 'tracker_user' } }),
      },
    });
    const result = await store.dispatch(
      syncProfiles({ codechef: 'chef_handle' }),
    );

    assert.equal(syncProfiles.fulfilled.match(result), true);
    assert.equal(store.getState().user.user.platformHandles.codechef, 'chef_handle');
    assert.equal(store.getState().user.syncStatus, 'failed');
    assert.equal(store.getState().user.syncResults[0].ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
