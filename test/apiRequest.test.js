import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest } from '../store/api.js';

test('API errors include a safe correlation ID for server failures', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Request could not be completed.',
        },
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'diagnostic-request-123',
        },
      },
    );

  try {
    await assert.rejects(
      apiRequest('/api/auth/register'),
      /Request ID: diagnostic-request-123/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
