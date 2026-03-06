import { Outlet, NavLink } from 'react-router-dom'
import { Map, Route, Compass, PlayCircle, Image, Settings, Menu, X } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: Map, label: '地图' },
  { to: '/trips', icon: Route, label: '旅行' },
  { to: '/planner', icon: Compass, label: '计划' },
  { to: '/timeline', icon: PlayCircle, label: '时间线' },
  { to: '/gallery', icon: Image, label: '照片墙' },
  { to: '/settings', icon: Settings, label: '设置' },
]

export default function AppLayout() {
  const { darkMode } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top nav bar */}
      <header className={`flex items-center justify-between px-5 h-14 border-b shrink-0 ${darkMode ? 'bg-gray-900/80 border-gray-800/60 backdrop-blur-xl' : 'bg-white/70 border-gray-200/50 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}>
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/25">
            <Map size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Travel Memories
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl p-1 border border-gray-200/30 dark:border-gray-700/30">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm shadow-gray-200/50 dark:bg-gray-700 dark:text-blue-400 dark:shadow-none'
                    : darkMode
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`
              }
            >
              <item.icon size={14} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <nav className={`md:hidden border-b px-2 py-2 animate-slide-down ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-apple-gray6 text-apple-blue dark:bg-gray-700 dark:text-blue-400'
                    : darkMode
                      ? 'text-gray-300'
                      : 'text-gray-600'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-0 relative">
        <Outlet />
      </main>
    </div>
  )
}
