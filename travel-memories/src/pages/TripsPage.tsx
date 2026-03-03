import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Trip, TripStatus } from '@/types'
import { TRIP_COLORS } from '@/types'
import {
  Plus,
  Trash2,
  MapPin,
  Calendar,
  X,
  Tag,
  Loader2,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Globe,
} from 'lucide-react'
import { format } from 'date-fns'

type FilterTab = 'all' | 'completed' | 'planned'

export default function TripsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<TripStatus>('planned')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formColor, setFormColor] = useState(TRIP_COLORS[0])
  const [formTagInput, setFormTagInput] = useState('')
  const [formTags, setFormTags] = useState<string[]>([])

  const trips = useLiveQuery(() => db.trips.orderBy('startDate').reverse().toArray())
  const places = useLiveQuery(() => db.places.toArray())

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const placeCountMap = useMemo(() => {
    const map = new Map<number, number>()
    if (places) {
      for (const place of places) {
        map.set(place.tripId, (map.get(place.tripId) || 0) + 1)
      }
    }
    return map
  }, [places])

  const filteredTrips = useMemo(() => {
    if (!trips) return []
    if (activeTab === 'all') return trips
    return trips.filter((t) => t.status === activeTab)
  }, [trips, activeTab])

  const tabCounts = useMemo(() => {
    if (!trips) return { all: 0, completed: 0, planned: 0 }
    return {
      all: trips.length,
      completed: trips.filter((t) => t.status === 'completed').length,
      planned: trips.filter((t) => t.status === 'planned').length,
    }
  }, [trips])

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormStatus('planned')
    setFormStartDate('')
    setFormEndDate('')
    setFormColor(TRIP_COLORS[0])
    setFormTagInput('')
    setFormTags([])
  }

  const handleCreateTrip = async () => {
    if (!formName.trim()) return
    const now = new Date().toISOString()
    const trip: Trip = {
      name: formName.trim(),
      description: formDescription.trim(),
      status: formStatus,
      startDate: formStartDate,
      endDate: formEndDate,
      tags: formTags,
      color: formColor,
      createdAt: now,
      updatedAt: now,
    }
    await db.trips.add(trip)
    resetForm()
    setShowForm(false)
  }

  const handleDeleteTrip = async (id: number) => {
    await db.photos.where('tripId').equals(id).delete()
    await db.places.where('tripId').equals(id).delete()
    await db.trips.delete(id)
    setDeleteConfirmId(null)
  }

  const handleAddTag = () => {
    const tag = formTagInput.trim()
    if (tag && !formTags.includes(tag)) {
      setFormTags([...formTags, tag])
      setFormTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormTags(formTags.filter((t) => t !== tag))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const isLoading = trips === undefined

  const tabs: { key: FilterTab; label: string; icon: typeof Globe }[] = [
    { key: 'all', label: '全部', icon: Globe },
    { key: 'completed', label: '已完成', icon: CheckCircle2 },
    { key: 'planned', label: '计划中', icon: Clock },
  ]

  return (
    <div className="h-full overflow-y-auto bg-apple-gray6 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              我的旅行
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              记录每一段精彩旅程
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-apple-blue hover:bg-apple-blue/85 active:opacity-70 text-white rounded-xl font-medium transition-colors"
          >
            <Plus size={18} strokeWidth={2.5} />
            新建旅行
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => {
            const count = tabCounts[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-gray-800 text-apple-blue dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Create trip modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => { setShowForm(false); resetForm() }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in">
              {/* Modal header with gradient */}
              <div
                className="px-6 pt-6 pb-4"
                style={{ background: `linear-gradient(135deg, ${formColor}15, ${formColor}08)` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: formColor + '20' }}
                    >
                      <Sparkles size={20} style={{ color: formColor }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">新建旅行</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">规划你的下一段旅程</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-6 space-y-5">
                {/* Trip name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    旅行名称 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例如：云南大理之旅"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    描述
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="简单描述一下这次旅行..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Status toggle */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    状态
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('planned')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        formStatus === 'planned'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Clock size={15} />
                      计划中
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('completed')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        formStatus === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <CheckCircle2 size={15} />
                      已完成
                    </button>
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    主题色
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {TRIP_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormColor(color)}
                        className={`w-8 h-8 rounded-full transition-all duration-200 ${
                          formColor === color
                            ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800'
                            : 'hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: color,
                          ...(formColor === color ? { ['--tw-ring-color' as string]: color } : {}),
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Dates in a row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      开始日期
                    </label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      结束日期
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    标签
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formTagInput}
                      onChange={(e) => setFormTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="输入标签，按 Enter 添加"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 outline-none transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Tag size={16} />
                    </button>
                  </div>
                  {formTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {formTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-blue-800 dark:hover:text-blue-200 ml-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTrip}
                    disabled={!formName.trim()}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-apple-blue hover:bg-apple-blue/85 active:opacity-70 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    创建旅行
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trip cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-blue-400" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-apple-gray6 dark:bg-gray-800 mb-5">
              <Globe size={36} className="text-blue-400" />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
              {activeTab !== 'all' ? '暂无此类旅行' : '还没有旅行记录'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 mb-6">
              {activeTab !== 'all'
                ? '试试切换到"全部"标签或创建新旅行'
                : '点击"新建旅行"开始记录你的旅途'}
            </p>
            {activeTab === 'all' && (
              <button
                onClick={() => { resetForm(); setShowForm(true) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-apple-blue hover:bg-apple-blue/85 active:opacity-70 text-white rounded-xl font-medium transition-colors"
              >
                <Plus size={18} />
                新建旅行
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 overflow-hidden transition-colors cursor-pointer"
              >
                {/* Cover gradient */}
                <div
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="h-32 relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: trip.color,
                    }}
                  />

                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold backdrop-blur-sm ${
                        trip.status === 'completed'
                          ? 'bg-white/90 text-emerald-600'
                          : 'bg-white/90 text-amber-600'
                      }`}
                    >
                      {trip.status === 'completed' ? '已完成' : '计划中'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/20 backdrop-blur-sm text-white text-xs font-medium">
                      <MapPin size={11} />
                      {placeCountMap.get(trip.id!) || 0} 地点
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4" onClick={() => navigate(`/trips/${trip.id}`)}>
                  <h3 className="font-bold text-gray-900 dark:text-white truncate text-[15px] mb-1">
                    {trip.name}
                  </h3>
                  {trip.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                      {trip.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <Calendar size={12} />
                    <span>
                      {trip.startDate
                        ? format(new Date(trip.startDate), 'yyyy/MM/dd')
                        : '未设置'}
                      {trip.endDate && (
                        <>
                          <ArrowRight size={10} className="inline mx-1" />
                          {format(new Date(trip.endDate), 'MM/dd')}
                        </>
                      )}
                    </span>
                  </div>

                  {trip.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {trip.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{
                            backgroundColor: trip.color + '15',
                            color: trip.color,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {trip.tags.length > 3 && (
                        <span className="text-xs px-2 py-0.5 text-gray-400 dark:text-gray-500">
                          +{trip.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 pb-3 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1 transition-colors"
                  >
                    查看详情
                    <ArrowRight size={12} />
                  </button>
                  {deleteConfirmId === trip.id ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-red-500 font-medium">删除？</span>
                      <button
                        onClick={() => handleDeleteTrip(trip.id!)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                      >
                        确定
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(trip.id!) }}
                      className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
