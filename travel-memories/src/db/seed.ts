import { db } from './index'
import type { Trip, Place } from '@/types'

export async function seedMockData() {
  const count = await db.trips.count()
  if (count > 0) return // 已有数据则跳过

  const now = new Date().toISOString()

  // ── 旅行 1: 云南大理之旅（已完成）──
  const t1 = await db.trips.add({
    name: '云南大理之旅',
    description: '冬日暖阳，苍山洱海间的悠闲时光。从昆明出发，一路自驾到大理古城，环洱海骑行，最后北上丽江看玉龙雪山。',
    status: 'completed',
    startDate: '2025-12-20',
    endDate: '2025-12-28',
    tags: ['自驾', '古城', '雪山', '湖泊'],
    color: '#3b82f6',
    createdAt: now,
    updatedAt: now,
  } as Trip)

  await db.places.bulkAdd([
    { tripId: t1, name: '昆明长水机场', latitude: 25.1, longitude: 102.74, address: '云南省昆明市官渡区', visitDate: '2025-12-20', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t1, name: '大理古城', latitude: 25.69, longitude: 100.16, address: '云南省大理白族自治州大理市', visitDate: '2025-12-21', sortOrder: 2, transportMode: 'driving', rating: 5 },
    { tripId: t1, name: '洱海环湖东路', latitude: 25.73, longitude: 100.21, address: '云南省大理市环海东路', visitDate: '2025-12-23', sortOrder: 3, transportMode: 'driving', rating: 5 },
    { tripId: t1, name: '双廊古镇', latitude: 25.92, longitude: 100.19, address: '云南省大理市双廊镇', visitDate: '2025-12-24', sortOrder: 4, transportMode: 'driving', rating: 4 },
    { tripId: t1, name: '丽江古城', latitude: 26.87, longitude: 100.23, address: '云南省丽江市古城区', visitDate: '2025-12-25', sortOrder: 5, transportMode: 'driving', rating: 4 },
    { tripId: t1, name: '玉龙雪山', latitude: 27.12, longitude: 100.17, address: '云南省丽江市玉龙纳西族自治县', visitDate: '2025-12-26', sortOrder: 6, transportMode: 'driving', rating: 5 },
  ] as Place[])

  // ── 旅行 2: 日本关西行（已完成）──
  const t2 = await db.trips.add({
    name: '日本关西行',
    description: '京都的红叶，大阪的美食，奈良的小鹿。坐新干线穿梭在古都与现代之间。',
    status: 'completed',
    startDate: '2025-11-01',
    endDate: '2025-11-08',
    tags: ['红叶', '温泉', '美食', '寺庙'],
    color: '#ef4444',
    createdAt: now,
    updatedAt: now,
  } as Trip)

  await db.places.bulkAdd([
    { tripId: t2, name: '大阪关西机场', latitude: 34.43, longitude: 135.24, address: '大阪府泉佐野市', visitDate: '2025-11-01', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t2, name: '大阪道顿堀', latitude: 34.67, longitude: 135.50, address: '大阪市中央区', visitDate: '2025-11-02', sortOrder: 2, transportMode: 'train', rating: 5 },
    { tripId: t2, name: '京都清水寺', latitude: 34.99, longitude: 135.78, address: '京都市东山区', visitDate: '2025-11-03', sortOrder: 3, transportMode: 'train', rating: 5 },
    { tripId: t2, name: '京都岚山竹林', latitude: 35.02, longitude: 135.67, address: '京都市右京区', visitDate: '2025-11-04', sortOrder: 4, transportMode: 'train', rating: 5 },
    { tripId: t2, name: '奈良公园', latitude: 34.69, longitude: 135.84, address: '奈良市', visitDate: '2025-11-05', sortOrder: 5, transportMode: 'train', rating: 4 },
    { tripId: t2, name: '神户港', latitude: 34.68, longitude: 135.19, address: '神户市中央区', visitDate: '2025-11-07', sortOrder: 6, transportMode: 'train', rating: 4 },
  ] as Place[])

  // ── 旅行 3: 新疆自驾计划（计划中）──
  const t3 = await db.trips.add({
    name: '新疆自驾计划',
    description: '独库公路、赛里木湖、喀纳斯，一路向西，追寻中国最壮美的公路风景。',
    status: 'planned',
    startDate: '2026-07-15',
    endDate: '2026-07-28',
    tags: ['自驾', '草原', '雪山', '公路旅行'],
    color: '#10b981',
    createdAt: now,
    updatedAt: now,
  } as Trip)

  await db.places.bulkAdd([
    { tripId: t3, name: '乌鲁木齐地窝堡机场', latitude: 43.82, longitude: 87.62, address: '新疆乌鲁木齐市新市区', visitDate: '2026-07-15', sortOrder: 1, transportMode: 'flight', rating: 0 },
    { tripId: t3, name: '赛里木湖', latitude: 44.60, longitude: 81.17, address: '新疆博尔塔拉蒙古自治州', visitDate: '2026-07-17', sortOrder: 2, transportMode: 'driving', rating: 0 },
    { tripId: t3, name: '那拉提草原', latitude: 43.35, longitude: 84.01, address: '新疆伊犁哈萨克自治州', visitDate: '2026-07-20', sortOrder: 3, transportMode: 'driving', rating: 0 },
    { tripId: t3, name: '独库公路', latitude: 42.95, longitude: 83.50, address: '新疆阿克苏地区', visitDate: '2026-07-21', sortOrder: 4, transportMode: 'driving', rating: 0 },
    { tripId: t3, name: '喀纳斯湖', latitude: 48.72, longitude: 87.01, address: '新疆阿勒泰地区', visitDate: '2026-07-23', sortOrder: 5, transportMode: 'driving', rating: 0 },
    { tripId: t3, name: '禾木村', latitude: 48.85, longitude: 87.35, address: '新疆阿勒泰地区布尔津县', visitDate: '2026-07-25', sortOrder: 6, transportMode: 'driving', rating: 0 },
  ] as Place[])

  // ── 旅行 4: 北京周末游（已完成）──
  const t4 = await db.trips.add({
    name: '北京周末游',
    description: '故宫、长城、胡同里的老北京味道。国庆三天短途打卡帝都经典。',
    status: 'completed',
    startDate: '2025-10-01',
    endDate: '2025-10-03',
    tags: ['历史', '古迹', '美食'],
    color: '#8b5cf6',
    createdAt: now,
    updatedAt: now,
  } as Trip)

  await db.places.bulkAdd([
    { tripId: t4, name: '北京首都机场', latitude: 40.08, longitude: 116.59, address: '北京市顺义区', visitDate: '2025-10-01', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t4, name: '故宫博物院', latitude: 39.92, longitude: 116.39, address: '北京市东城区景山前街4号', visitDate: '2025-10-01', sortOrder: 2, transportMode: 'driving', rating: 5 },
    { tripId: t4, name: '八达岭长城', latitude: 40.35, longitude: 116.02, address: '北京市延庆区', visitDate: '2025-10-02', sortOrder: 3, transportMode: 'driving', rating: 5 },
    { tripId: t4, name: '南锣鼓巷', latitude: 39.94, longitude: 116.40, address: '北京市东城区', visitDate: '2025-10-03', sortOrder: 4, transportMode: 'driving', rating: 4 },
  ] as Place[])

  // ── 旅行 5: 成都美食之旅（已完成）──
  const t5 = await db.trips.add({
    name: '成都美食之旅',
    description: '火锅、串串、兔头……在天府之国用味蕾旅行。顺便看看大熊猫。',
    status: 'completed',
    startDate: '2025-09-10',
    endDate: '2025-09-14',
    tags: ['美食', '熊猫', '休闲'],
    color: '#f97316',
    createdAt: now,
    updatedAt: now,
  } as Trip)

  await db.places.bulkAdd([
    { tripId: t5, name: '成都双流机场', latitude: 30.58, longitude: 103.95, address: '四川省成都市双流区', visitDate: '2025-09-10', sortOrder: 1, transportMode: 'flight', rating: 3 },
    { tripId: t5, name: '宽窄巷子', latitude: 30.67, longitude: 104.05, address: '四川省成都市青羊区', visitDate: '2025-09-11', sortOrder: 2, transportMode: 'driving', rating: 4 },
    { tripId: t5, name: '成都大熊猫基地', latitude: 30.74, longitude: 104.14, address: '四川省成都市成华区', visitDate: '2025-09-12', sortOrder: 3, transportMode: 'driving', rating: 5 },
    { tripId: t5, name: '锦里古街', latitude: 30.65, longitude: 104.05, address: '四川省成都市武侯区', visitDate: '2025-09-13', sortOrder: 4, transportMode: 'driving', rating: 4 },
    { tripId: t5, name: '都江堰', latitude: 31.00, longitude: 103.61, address: '四川省成都市都江堰市', visitDate: '2025-09-14', sortOrder: 5, transportMode: 'driving', rating: 5 },
  ] as Place[])

  // ── 旅行 6: 厦门海岛计划（计划中）──
  const t6 = await db.trips.add({
    name: '厦门海岛度假',
    description: '鼓浪屿的琴声，环岛路的海风，还有沙茶面和土笋冻。',
    status: 'planned',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    tags: ['海岛', '文艺', '美食'],
    color: '#06b6d4',
    createdAt: now,
    updatedAt: now,
  } as Trip)

  await db.places.bulkAdd([
    { tripId: t6, name: '厦门高崎机场', latitude: 24.54, longitude: 118.13, address: '福建省厦门市湖里区', visitDate: '2026-05-01', sortOrder: 1, transportMode: 'flight', rating: 0 },
    { tripId: t6, name: '鼓浪屿', latitude: 24.45, longitude: 118.07, address: '福建省厦门市思明区', visitDate: '2026-05-02', sortOrder: 2, transportMode: 'driving', rating: 0 },
    { tripId: t6, name: '曾厝垵', latitude: 24.44, longitude: 118.10, address: '福建省厦门市思明区', visitDate: '2026-05-03', sortOrder: 3, transportMode: 'driving', rating: 0 },
    { tripId: t6, name: '环岛路', latitude: 24.44, longitude: 118.15, address: '福建省厦门市思明区', visitDate: '2026-05-04', sortOrder: 4, transportMode: 'driving', rating: 0 },
  ] as Place[])

  console.log('[Seed] Mock data created: 6 trips, 31 places')
}
