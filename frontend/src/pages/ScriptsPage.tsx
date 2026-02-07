import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { scriptApi, ScriptResponse } from '../services/api'

const scriptTypes = [
  { value: '', label: 'All Types' },
  { value: 'reel', label: 'Reel' },
  { value: 'short', label: 'YouTube Short' },
  { value: 'youtube', label: 'YouTube Video' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'ad', label: 'Ad' },
  { value: 'story', label: 'Story' },
]

const languages = [
  { value: '', label: 'All Languages' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'en', label: 'English' },
  { value: 'hinglish', label: 'Hinglish' },
]

export default function ScriptsPage() {
  const [filters, setFilters] = useState({
    language: '',
    script_type: '',
    is_favorite: undefined as boolean | undefined,
    search: '',
    page: 1,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['scripts', filters],
    queryFn: () => scriptApi.list(filters),
  })

  const scripts = data?.data?.items || []
  const hasMore = data?.data?.has_more || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Scripts</h1>
          <p className="text-gray-600 mt-1">
            Generate and manage your content scripts
          </p>
        </div>
        <Link to="/scripts/new" className="btn-primary whitespace-nowrap">
          <span className="mr-2">+</span>
          Generate New Script
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              placeholder="Search scripts..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value, page: 1 })}
              className="input-field"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.script_type}
              onChange={(e) => setFilters({ ...filters, script_type: e.target.value, page: 1 })}
              className="input-field"
            >
              {scriptTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Favorites
            </label>
            <select
              value={filters.is_favorite === undefined ? '' : filters.is_favorite ? 'true' : 'false'}
              onChange={(e) => 
                setFilters({ 
                  ...filters, 
                  is_favorite: e.target.value === '' ? undefined : e.target.value === 'true',
                  page: 1 
                })
              }
              className="input-field"
            >
              <option value="">All Scripts</option>
              <option value="true">Favorites Only</option>
              <option value="false">Non-Favorites</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scripts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading scripts...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-red-200">
          <p className="text-red-600">Failed to load scripts. Please try again.</p>
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900">No scripts yet</h3>
          <p className="text-gray-500 mt-1">Generate your first script to get started</p>
          <Link to="/scripts/new" className="btn-primary inline-block mt-4">
            Generate Script
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {scripts.map((script: ScriptResponse, index: number) => (
            <ScriptCard key={script.id} script={script} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {scripts.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">Page {filters.page}</span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={!hasMore}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

interface ScriptCardProps {
  script: ScriptResponse
  index: number
}

function ScriptCard({ script, index }: ScriptCardProps) {
  const languageLabels: Record<string, string> = {
    hi: 'हिंदी',
    en: 'English',
    hinglish: 'Hinglish',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/scripts/${script.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {script.is_favorite && <span className="text-yellow-500">⭐</span>}
              <h3 className="font-semibold text-gray-900 truncate">{script.title}</h3>
            </div>
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {script.content.substring(0, 150)}...
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full">
                {languageLabels[script.language] || script.language}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                {script.script_type}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                {script.category}
              </span>
              <span className="text-xs text-gray-500">
                {script.word_count} words • {script.target_duration_seconds}s
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
