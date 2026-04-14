import {
  Heart, Sparkles, Trophy, Star, Ghost, Coffee, Utensils, Zap, Smile,
  Coins, Gift, Flower, Keyboard, ShoppingCart, Ticket, Moon, Sun, Cloud,
  Music, Camera, Cake, Wine, IceCream, Pizza, Candy, Dog, Cat, Bird, Fish,
  Plane, Car, Train, Ship, Bike, Mountain, Trees, Sunrise, Rainbow,
  Diamond, Crown, Flame, Snowflake, Umbrella, Glasses, Shirt, Gem,
  HandHeart, Popcorn, Martini, Bell, Rocket, Feather, Palette,
  Book, Headphones, Phone, Tv, Gamepad2, PartyPopper,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// 所有可用的 icon —— 后台下拉选
export const ICON_MAP: Record<string, LucideIcon> = {
  Heart, Sparkles, Trophy, Star, Ghost, Coffee, Utensils, Zap, Smile,
  Coins, Gift, Flower, Keyboard, ShoppingCart, Ticket, Moon, Sun, Cloud,
  Music, Camera, Cake, Wine, IceCream, Pizza, Candy, Dog, Cat, Bird, Fish,
  Plane, Car, Train, Ship, Bike, Mountain, Trees, Sunrise, Rainbow,
  Diamond, Crown, Flame, Snowflake, Umbrella, Glasses, Shirt, Gem,
  HandHeart, Popcorn, Martini, Bell, Rocket, Feather, Palette,
  Book, Headphones, Phone, Tv, Gamepad2, PartyPopper,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

// 常用颜色池
export const COLOR_OPTIONS: Array<{ label: string; value: string; swatch: string }> = [
  { label: '红', value: 'text-red-500', swatch: '#ef4444' },
  { label: '深红', value: 'text-red-600', swatch: '#dc2626' },
  { label: '粉', value: 'text-pink-500', swatch: '#ec4899' },
  { label: '浅粉', value: 'text-pink-400', swatch: '#f472b6' },
  { label: '深粉', value: 'text-pink-600', swatch: '#db2777' },
  { label: '橙', value: 'text-orange-500', swatch: '#f97316' },
  { label: '浅橙', value: 'text-orange-400', swatch: '#fb923c' },
  { label: '金', value: 'text-yellow-600', swatch: '#ca8a04' },
  { label: '黄', value: 'text-yellow-500', swatch: '#eab308' },
  { label: '琥珀', value: 'text-amber-700', swatch: '#b45309' },
  { label: '棕', value: 'text-amber-800', swatch: '#92400e' },
  { label: '绿', value: 'text-green-600', swatch: '#16a34a' },
  { label: '青绿', value: 'text-teal-500', swatch: '#14b8a6' },
  { label: '青', value: 'text-cyan-500', swatch: '#06b6d4' },
  { label: '天蓝', value: 'text-sky-500', swatch: '#0ea5e9' },
  { label: '蓝', value: 'text-blue-600', swatch: '#2563eb' },
  { label: '靛', value: 'text-indigo-500', swatch: '#6366f1' },
  { label: '紫', value: 'text-purple-600', swatch: '#9333ea' },
  { label: '浅紫', value: 'text-violet-500', swatch: '#8b5cf6' },
  { label: '灰', value: 'text-gray-400', swatch: '#9ca3af' },
];
