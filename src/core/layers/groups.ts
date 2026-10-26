import type { ResolvedGroupConfig } from '../config/types';

/** A group of layers and overlays (`groups[]`, `layers[].group`, `overlays[].group`). */
export interface GroupInfo {
  id: string;
  title: string;
  /** Whether the layer list starts with the group closed. */
  collapsed: boolean;
  /** Ids of the member vector layers, in drawing order (bottom first). */
  layers: string[];
  /** Ids of the member overlays, in drawing order (bottom first). */
  overlays: string[];
}

/** Anything that may name a group: a layer or overlay info. */
interface Member {
  id: string;
  group?: string;
}

/**
 * The groups with their current members: the declared ones in config order, then one for every
 * other `group` a member names (title = id), in the order they first appear. A declared group
 * without members is listed with empty member lists.
 */
export function listGroups(
  declared: readonly ResolvedGroupConfig[],
  layers: readonly Member[],
  overlays: readonly Member[],
): GroupInfo[] {
  const groups = new Map<string, GroupInfo>();
  for (const g of declared) {
    groups.set(g.id, {
      id: g.id,
      title: g.title,
      collapsed: g.collapsed,
      layers: [],
      overlays: [],
    });
  }
  const join = (members: readonly Member[], kind: 'layers' | 'overlays') => {
    for (const member of members) {
      if (member.group === undefined) continue;
      let group = groups.get(member.group);
      if (!group) {
        group = {
          id: member.group,
          title: member.group,
          collapsed: false,
          layers: [],
          overlays: [],
        };
        groups.set(member.group, group);
      }
      group[kind].push(member.id);
    }
  };
  // Overlays first: they are drawn below the layers, so implicit groups follow the drawing order.
  join(overlays, 'overlays');
  join(layers, 'layers');
  return [...groups.values()];
}
