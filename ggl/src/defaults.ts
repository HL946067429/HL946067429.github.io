import type { ItemsConfig } from './types';

// 万一 items.json 请求失败时的兜底
export const DEFAULT_CONFIG: ItemsConfig = {
  rows: 5,
  cols: 4,
  items: [
    { id: 1, title: '三套定制键帽', icon: 'Keyboard', iconColor: 'text-blue-600', value: '¥888', type: 'real' },
    { id: 2, title: '洗碗券一次', icon: 'Utensils', iconColor: 'text-green-600', value: '¥10', type: 'funny' },
    { id: 3, title: '一束浪漫鲜花', icon: 'Flower', iconColor: 'text-pink-600', value: '¥520', type: 'real' },
    { id: 4, title: '不准生气券', icon: 'Ghost', iconColor: 'text-purple-600', value: '¥99', type: 'funny' },
    { id: 5, title: '一份真刮刮乐', icon: 'Trophy', iconColor: 'text-yellow-600', value: '¥100', type: 'real' },
    { id: 6, title: '亲亲一个', icon: 'Smile', iconColor: 'text-red-500', value: '¥1314', type: 'funny' },
    { id: 7, title: '再来一瓶空气', icon: 'Zap', iconColor: 'text-cyan-500', value: '¥0', type: 'funny' },
    { id: 8, title: '陪逛街不喊累', icon: 'Star', iconColor: 'text-orange-500', value: '¥200', type: 'funny' },
    { id: 9, title: '清空购物车', icon: 'ShoppingCart', iconColor: 'text-amber-700', value: '¥100', type: 'funny' },
    { id: 10, title: '捏脚10分钟', icon: 'Coins', iconColor: 'text-yellow-700', value: '¥50', type: 'funny' },
    { id: 11, title: '奶茶一杯', icon: 'Coffee', iconColor: 'text-amber-800', value: '¥25', type: 'real' },
    { id: 12, title: '电影票两张', icon: 'Ticket', iconColor: 'text-red-600', value: '¥120', type: 'real' },
    { id: 13, title: '承包一周早餐', icon: 'Sun', iconColor: 'text-orange-400', value: '¥150', type: 'funny' },
    { id: 14, title: '最美称号', icon: 'Heart', iconColor: 'text-pink-400', value: '¥∞', type: 'funny' },
    { id: 15, title: '听我唠叨一次', icon: 'Music', iconColor: 'text-indigo-500', value: '¥200', type: 'funny' },
    { id: 16, title: '美美合照一张', icon: 'Camera', iconColor: 'text-teal-500', value: '¥88', type: 'real' },
    { id: 17, title: '睡前故事一则', icon: 'Moon', iconColor: 'text-violet-500', value: '¥30', type: 'funny' },
    { id: 18, title: '承包家务一天', icon: 'Cloud', iconColor: 'text-sky-500', value: '¥200', type: 'funny' },
    { id: 19, title: '谢谢参与', icon: 'Gift', iconColor: 'text-gray-400', value: '¥0', type: 'filler' },
    { id: 20, title: '谢谢参与', icon: 'Star', iconColor: 'text-gray-400', value: '¥0', type: 'filler' },
  ],
};
