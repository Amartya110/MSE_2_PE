import test from 'node:test';
import assert from 'node:assert/strict';
import { configureStore } from '@reduxjs/toolkit';
import compareReducer, {
  fetchHeadToHeadComparison,
} from '../store/compareSlice.js';

test('head-to-head thunk calls the public GET endpoint and stores comparison payload', async () => {
  const originalFetch = globalThis.fetch;
  const payload = { platform: 'codeforces', users: [] };
  let requestUrl;
  globalThis.fetch = async (url) => {
    requestUrl = url;
    return new Response(JSON.stringify({ ok: true, comparison: payload }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const store = configureStore({ reducer: { compare: compareReducer } });
    const result = await store.dispatch(
      fetchHeadToHeadComparison({
        platform: 'codeforces',
        handle1: 'first_user',
        handle2: 'second.user',
      }),
    );

    assert.equal(
      requestUrl,
      '/api/compare/codeforces?u1=first_user&u2=second.user',
    );
    assert.equal(fetchHeadToHeadComparison.fulfilled.match(result), true);
    assert.deepEqual(store.getState().compare.data, payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
