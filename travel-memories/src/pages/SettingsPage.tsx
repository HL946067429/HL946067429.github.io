import { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Trip, Place, Photo } from '@/types'
import { useAppStore } from '@/stores/appStore'
import JSZip from 'jszip'
import {
  Moon,
  Sun,
  Download,
  Upload,
  Trash2,
  MapPin,
  Image,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Route,
  Shield,
  HardDrive,
  Palette,
  FileArchive,
  Info,
} from 'lucide-react'

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useAppStore()

  const tripCount = useLiveQuery(() => db.trips.count())
  const placeCount = useLiveQuery(() => db.places.count())
  const photoCount = useLiveQuery(() => db.photos.count())

  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const trips = await db.trips.toArray()
      const places = await db.places.toArray()
      const photos = await db.photos.toArray()

      const zip = new JSZip()
      const data = {
        trips,
        places,
        photos: photos.map((p) => ({
          id: p.id,
          placeId: p.placeId,
          tripId: p.tripId,
          fileName: p.fileName,
          width: p.width,
          height: p.height,
          takenAt: p.takenAt,
          caption: p.caption,
        })),
      }
      zip.file('data.json', JSON.stringify(data, null, 2))

      const photosFolder = zip.folder('photos')
      if (photosFolder) {
        for (const photo of photos) {
          const ext = photo.fileName.split('.').pop() || 'jpg'
          photosFolder.file(`${photo.id}_${photo.fileName}`, photo.blob)
          photosFolder.file(`${photo.id}_thumb.${ext}`, photo.thumbnail)
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `travel-memories-export-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const zip = await JSZip.loadAsync(file)
      const dataFile = zip.file('data.json')
      if (!dataFile) {
        setImportResult({ success: false, message: '无效的导出文件：找不到 data.json' })
        setImporting(false)
        return
      }

      const dataStr = await dataFile.async('string')
      const data = JSON.parse(dataStr) as {
        trips: Trip[]
        places: Place[]
        photos: Array<{
          id?: number
          placeId: number
          tripId: number
          fileName: string
          width: number
          height: number
          takenAt: string
          caption: string
        }>
      }

      const tripIdMap = new Map<number, number>()
      for (const trip of data.trips) {
        const oldId = trip.id!
        const { id: _id, ...tripData } = trip as Trip & { id: number }
        void _id
        const newId = await db.trips.add(tripData as Trip)
        tripIdMap.set(oldId, newId)
      }

      const placeIdMap = new Map<number, number>()
      for (const place of data.places) {
        const oldId = place.id!
        const newTripId = tripIdMap.get(place.tripId) ?? place.tripId
        const { id: _id, ...placeData } = place as Place & { id: number }
        void _id
        const newId = await db.places.add({ ...placeData, tripId: newTripId } as Place)
        placeIdMap.set(oldId, newId)
      }

      const photosFolder = zip.folder('photos')
      if (photosFolder && data.photos) {
        for (const photoMeta of data.photos) {
          const oldId = photoMeta.id
          const newPlaceId = placeIdMap.get(photoMeta.placeId) ?? photoMeta.placeId
          const newTripId = tripIdMap.get(photoMeta.tripId) ?? photoMeta.tripId

          let blobData: Blob | null = null
          let thumbData: Blob | null = null

          if (oldId !== undefined) {
            const blobFile = photosFolder.file(`${oldId}_${photoMeta.fileName}`)
            if (blobFile) blobData = await blobFile.async('blob')

            const ext = photoMeta.fileName.split('.').pop() || 'jpg'
            const thumbFile = photosFolder.file(`${oldId}_thumb.${ext}`)
            if (thumbFile) thumbData = await thumbFile.async('blob')
          }

          if (blobData) {
            const photo: Photo = {
              placeId: newPlaceId,
              tripId: newTripId,
              blob: blobData,
              thumbnail: thumbData || blobData,
              fileName: photoMeta.fileName,
              width: photoMeta.width,
              height: photoMeta.height,
              takenAt: photoMeta.takenAt,
              caption: photoMeta.caption,
            }
            await db.photos.add(photo)
          }
        }
      }

      setImportResult({
        success: true,
        message: `成功导入 ${data.trips.length} 个旅行、${data.places.length} 个地点、${data.photos?.length ?? 0} 张照片`,
      })
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        message: `导入失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClear = async () => {
    if (clearStep < 2) {
      setClearStep((clearStep + 1) as 0 | 1 | 2)
      return
    }
    await db.photos.clear()
    await db.places.clear()
    await db.trips.clear()
    await db.routeCache.clear()
    setClearStep(0)
  }

  const statsLoading = tripCount === undefined || placeCount === undefined || photoCount === undefined

  return (
    <div className="h-full overflow-y-auto bg-apple-gray6 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            设置
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            个性化配置与数据管理
          </p>
        </div>

        {/* Appearance section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={14} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              外观
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  darkMode
                    ? 'bg-indigo-500/10'
                    : 'bg-amber-500/10'
                }`}>
                  {darkMode ? (
                    <Moon size={20} className="text-indigo-400" />
                  ) : (
                    <Sun size={20} className="text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">
                    {darkMode ? '深色模式' : '浅色模式'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {darkMode ? '护眼深色主题已启用' : '明亮浅色主题'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors duration-300 ${
                  darkMode ? 'bg-apple-blue' : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-[22px] w-[22px] transform rounded-full bg-white shadow-md transition-all duration-300 ${
                    darkMode ? 'translate-x-[26px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Storage section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive size={14} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              存储统计
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 p-5">
                {[
                  { icon: Route, count: tripCount, label: '旅行', bg: 'bg-apple-blue' },
                  { icon: MapPin, count: placeCount, label: '地点', bg: 'bg-apple-green' },
                  { icon: Image, count: photoCount, label: '照片', bg: 'bg-apple-purple' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center justify-center py-3 sm:py-5 px-3 bg-gray-50/80 dark:bg-gray-700/30 rounded-xl">
                    <div className={`w-10 h-10 rounded-xl mb-2.5 flex items-center justify-center ${item.bg}`}>
                      <item.icon size={18} className="text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {item.count}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data management section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <FileArchive size={14} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              数据管理
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm divide-y divide-gray-100 dark:divide-gray-700/80">
            {/* Export */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/10">
                    <Download size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">
                      导出数据
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      将旅行、地点和照片打包为 ZIP 文件
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-apple-blue hover:bg-apple-blue/85 active:opacity-70 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      导出
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Import */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10">
                    <Upload size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">
                      导入数据
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      从 ZIP 备份文件恢复数据
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      导入
                    </>
                  )}
                </button>
              </div>

              {importResult && (
                <div
                  className={`mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
                    importResult.success
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  )}
                  <span>{importResult.message}</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-red-400" />
            <h2 className="text-xs font-semibold text-red-400 dark:text-red-500 uppercase tracking-wider">
              危险操作
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-500/10">
                    <Trash2 size={20} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">
                      清空所有数据
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      永久删除所有旅行、地点和照片
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {clearStep > 0 && (
                    <button
                      onClick={() => setClearStep(0)}
                      className="px-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                      取消
                    </button>
                  )}
                  <button
                    onClick={handleClear}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      clearStep === 0
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                        : clearStep === 1
                          ? 'bg-apple-red text-white hover:bg-apple-red/85 active:opacity-70'
                          : 'bg-apple-red text-white hover:bg-apple-red/85 active:opacity-70'
                    }`}
                  >
                    <Trash2 size={14} />
                    {clearStep === 0
                      ? '清空数据'
                      : clearStep === 1
                        ? '确定要删除？'
                        : '最终确认删除'}
                  </button>
                </div>
              </div>
              {clearStep > 0 && (
                <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>
                    {clearStep === 1
                      ? '此操作不可撤销。请再次点击确认删除所有数据。'
                      : '这是最后的确认！点击"最终确认删除"将永久清空所有内容。'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-gray-400" />
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              关于
            </h2>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-sm">
            <div className="p-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-apple-blue mb-4">
                <span className="text-2xl">🗺️</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Travel Memories</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">v1.0.0</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 leading-relaxed max-w-xs mx-auto">
                记录你走过的每一个地方，<br />
                规划你想去的每一段旅途。
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-400 dark:text-gray-500">
                <span>React + Leaflet</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>IndexedDB</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>OpenStreetMap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
