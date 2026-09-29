import { expect, it } from 'vitest';
import { shardKeyFor } from '@/lib/value/search-shard';

const manifest = { version: 1, split: ['xy', 'xy0', 'xy00'], maxPrefix: 5 };
it.each([
  [' XY00123 ', 'xy001'], ['xy0', 'xy0'], ['xy', 'xy'], ['xy9', 'xy9'],
  ['xy01', 'xy01'], ['x', 'x_'], ['NÉSTLÉ', 'ne'], ['0700', '07'],
  ['C&G', 'c&'], ['', ''], ['  ', ''], ['../../', ''],
])('routes %s to %s', (query, key) => {
  expect(shardKeyFor(query, manifest)).toBe(key);
});
