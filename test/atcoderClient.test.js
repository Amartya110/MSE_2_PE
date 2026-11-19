import test from 'node:test';
import assert from 'node:assert/strict';
import { AtCoderClient } from '../src/platforms/atcoderClient.js';

test('AtCoder comparison reuses the public problem-model dataset for a day', async () => {
  const client = new AtCoderClient();
  const modelRequests = [];
  client.fetchJson = async (url) => {
    if (url.includes('/history/json')) return [];
    if (url.includes('/user/submissions?')) return [];
    modelRequests.push(url);
    return { abc001_a: { difficulty: 250 } };
  };

  const first = await client.fetchProfile('first_user');
  const second = await client.fetchProfile('second_user');

  assert.equal(first.problemModels.abc001_a.difficulty, 250);
  assert.equal(second.problemModels.abc001_a.difficulty, 250);
  assert.equal(modelRequests.length, 1);
});
