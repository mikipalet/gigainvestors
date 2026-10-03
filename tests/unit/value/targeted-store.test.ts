import { describe, expect, it } from 'vitest';
import { mergeRows, mergeSearch } from '../../../scripts/value/targeted-store-merge';

describe('targeted store merge', () => {
  it('keeps unrelated rows and ordering, replaces only allowed IDs, and appends new IDs', () => {
    const live = [{ id: 'KEEP', price: 123.456789 }, { id: 'EDIT', price: 1 }];
    const candidate = [{ id: 'KEEP', price: 999 }, { id: 'EDIT', price: 2 }, { id: 'NEW', price: 3 }];
    expect(mergeRows(live, candidate, new Set(['EDIT', 'NEW']), r => r.id)).toEqual([
      { id: 'KEEP', price: 123.456789 }, { id: 'EDIT', price: 2 }, { id: 'NEW', price: 3 },
    ]);
    expect(live[1].price).toBe(1);
  });

  it('never deletes a live row just because a candidate omits it', () => {
    expect(mergeRows([{ id: 'KEEP' }], [], new Set(['KEEP']), r => r.id)).toEqual([{ id: 'KEEP' }]);
  });

  it('preserves existing search alias offsets while mapping appended target aliases', () => {
    const live = { rows: [['KEEP', 'Live', 'US', 'a', 42, null]], aliases: { keep: [0], shared: [0] } } as any;
    const candidate = { rows: [['NEW', 'New', 'US', 'a', 1, null], ['KEEP', 'Changed', 'US', 'a', 99, null]], aliases: { shared: [0, 1], fresh: [0], keep: [1] } } as any;
    expect(mergeSearch(live, candidate, new Set(['NEW']))).toEqual({
      rows: [['KEEP', 'Live', 'US', 'a', 42, null], ['NEW', 'New', 'US', 'a', 1, null]],
      aliases: { keep: [0], shared: [0, 1], fresh: [1] },
    });
    expect(live.aliases.shared).toEqual([0]);
  });

  it('rejects ambiguous duplicate company IDs', () => {
    expect(() => mergeRows([{ id: 'A' }, { id: 'A' }], [], new Set(), r => r.id)).toThrow(/duplicate/i);
  });
});
