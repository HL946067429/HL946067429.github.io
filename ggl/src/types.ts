export type ItemType = 'real' | 'funny' | 'filler';

export interface RawItem {
  id: number;
  title: string;
  tier?: string;      // 奖级标签：特等奖 / 一等奖 / 谢谢参与 等
  icon: string;       // icon name, see icons.ts
  iconColor: string;  // tailwind class like "text-blue-600"
  value: string;      // "¥888" / "¥0" etc.（已废弃但保留兼容）
  type: ItemType;
}

/** 奖级排序优先级（越靠前等级越高） */
export const TIER_ORDER = ['特等奖', '一等奖', '二等奖', '三等奖', '幸运奖', '安慰奖', '谢谢参与'];

export const tierRank = (tier: string): number => {
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? 999 : idx;
};

export const defaultTier = (type: ItemType): string =>
  type === 'real' ? '一等奖' : type === 'filler' ? '谢谢参与' : '幸运奖';

export const getTier = (item: RawItem): string => item.tier || defaultTier(item.type);

/** 将 items 按奖级聚合，并按等级排序 */
export const groupByTier = (items: RawItem[]): { tier: string; items: RawItem[] }[] => {
  const map = new Map<string, RawItem[]>();
  for (const item of items) {
    const t = getTier(item);
    if (!map.has(t)) map.set(t, []);
    map.get(t)!.push(item);
  }
  return Array.from(map.entries())
    .map(([tier, items]) => ({ tier, items }))
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
};

export interface ToastsConfig {
  real: string[];
  funny: string[];
  filler: string[];
}

export interface ItemsConfig {
  rows: number;
  cols: number;
  items: RawItem[];
  toasts?: ToastsConfig;
  wheelSpins?: number;  // 转盘可用次数，默认 3
}
