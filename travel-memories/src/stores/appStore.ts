import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  sidebarOpen: boolean
  darkMode: boolean
  mapCenter: [number, number]
  mapZoom: number
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setDarkMode: (dark: boolean) => void
  toggleDarkMode: () => void
  setMapView: (center: [number, number], zoom: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      mapCenter: [35.8617, 104.1954] as [number, number],
      mapZoom: 5,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setDarkMode: (dark) => set({ darkMode: dark }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
    }),
    { name: 'travel-app-store' }
  )
)
