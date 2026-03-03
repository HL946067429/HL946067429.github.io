import { Outlet, NavLink } from 'react-router-dom'
import { Map, ListTodo, Compass, PlayCircle, Settings, Menu, X } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useState } from 'react'

const navItems = [
  { to: '/', icon: Map, label: '地图' },
  { to: '/trips', icon: ListTodo, label: '旅行' },
  { to: '/planner', icon: Compass, label: '计划' },
  { to: '/timeline', icon: PlayCircle, label: '时间线' },
  { to: '/settings', icon: Settings, label: '设置' },
]

export default function AppLayout() {
  const { darkMode } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Top nav bar */}
      <header className={`flex items-center justify-between px-4 h-14 border-b shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
            Travel Memories
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <nav className={`md:hidden border-b px-2 py-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
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
