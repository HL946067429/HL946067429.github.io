export type ItemType = 'real' | 'funny' | 'filler';

export interface RawItem {
  id: number;
  title: string;
  icon: string;       // icon name, see icons.ts
  iconColor: string;  // tailwind class like "text-blue-600"
  value: string;      // "¥888" / "¥0" etc.
  type: ItemType;
}

export interface ItemsConfig {
  rows: number;
  cols: number;
  items: RawItem[];
}
