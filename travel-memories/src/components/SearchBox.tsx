import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { searchPlace } from '@/services/geocodeService'

interface SearchBoxProps {
  onSelect: (name: string, lat: number, lng: number) => void
}

interface SearchResult {
  name: string
  lat: number
  lng: number
}

export default function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }
    setLoading(true)
    try {
      const data = await searchPlace(text)
      setResults(data)
      setIsOpen(data.length > 0)
    } catch {
      setResults([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        doSearch(value)
      }, 500)
    },
    [doSearch],
  )

  const handleSelect = useCallback(
    (result: SearchResult) => {
      onSelect(result.name, result.lat, result.lng)
      setQuery('')
      setResults([])
      setIsOpen(false)
    },
    [onSelect],
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search places..."
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-300 bg-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={14} className="text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="absolute z-[1000] mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg
          dark:bg-gray-800 dark:border-gray-600">
          {loading && (
            <li className="px-3 py-2 text-sm text-gray-400">Searching...</li>
          )}
          {results.map((result, i) => (
            <li key={`${result.lat}-${result.lng}-${i}`}>
              <button
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700
                  text-gray-700 dark:text-gray-200 transition-colors"
              >
                {result.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
