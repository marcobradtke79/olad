import { describe, expect, it } from 'vitest';
import { listGroups } from './groups';

describe('listGroups', () => {
  it('lists declared groups first, then the ones members name, with members in order', () => {
    const groups = listGroups(
      [
        { id: 'b', title: 'B', collapsed: true },
        { id: 'empty', title: 'Empty', collapsed: false },
      ],
      [{ id: 'l1', group: 'b' }, { id: 'l2' }, { id: 'l3', group: 'x' }, { id: 'l4', group: 'b' }],
      [
        { id: 'o1', group: 'y' },
        { id: 'o2', group: 'b' },
      ],
    );
    expect(groups).toEqual([
      { id: 'b', title: 'B', collapsed: true, layers: ['l1', 'l4'], overlays: ['o2'] },
      { id: 'empty', title: 'Empty', collapsed: false, layers: [], overlays: [] },
      { id: 'y', title: 'y', collapsed: false, layers: [], overlays: ['o1'] },
      { id: 'x', title: 'x', collapsed: false, layers: ['l3'], overlays: [] },
    ]);
  });

  it('is empty without groups', () => {
    expect(listGroups([], [{ id: 'l' }], [{ id: 'o' }])).toEqual([]);
  });
});
