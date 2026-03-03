import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AppLayout from '@/components/AppLayout'

const HomePage = lazy(() => import('@/pages/HomePage'))
const TripsPage = lazy(() => import('@/pages/TripsPage'))
const TripDetailPage = lazy(() => import('@/pages/TripDetailPage'))
const PlannerPage = lazy(() => import('@/pages/PlannerPage'))
const TimelinePage = lazy(() => import('@/pages/TimelinePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/:id" element={<TripDetailPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
