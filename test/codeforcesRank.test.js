import test from 'node:test';
import assert from 'node:assert/strict';
import { CodeforcesRankScale } from '../components/codeforcesRankScale.js';

test('maps Codeforces rating boundaries to the requested rank colors', () => {
  assert.deepEqual(CodeforcesRankScale.forRating(1199), {
    label: 'Newbie',
    color: '#808080',
  });
  assert.deepEqual(CodeforcesRankScale.forRating(1200), {
    label: 'Pupil',
    color: '#008000',
  });
  assert.deepEqual(CodeforcesRankScale.forRating(1400), {
    label: 'Specialist',
    color: '#03A89E',
  });
  assert.deepEqual(CodeforcesRankScale.forRating(1600), {
    label: 'Expert',
    color: '#0000FF',
  });
  assert.deepEqual(CodeforcesRankScale.forRating(1900), {
    label: 'Candidate Master',
    color: '#AA00AA',
  });
  assert.deepEqual(CodeforcesRankScale.forRating(2100), {
    label: 'Master',
    color: '#FF8C00',
  });
  assert.deepEqual(CodeforcesRankScale.forRating(2400), {
    label: 'Grandmaster',
    color: '#FF0000',
  });
  assert.equal(CodeforcesRankScale.forRating(null).label, 'Unrated');
});
