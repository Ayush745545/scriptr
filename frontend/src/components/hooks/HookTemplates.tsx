/**
 * HookTemplates — Browse the 20 proven hook templates for Indian audiences.
 * Filterable by hook type, with copy-to-use functionality.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { hookApi, HookTemplateItem } from '../../services/api'

const HOOK_TYPE_FILTERS = [
  { id: 'all', label: 'All Templates', icon: '📋' },
  { id: 'curiosity_gap', label: 'Curiosity Gap', icon: '🔮' },
  { id: 'contrarian', label: 'Contrarian', icon: '🔥' },
  { id: 'relatable_struggle', label: 'Relatable', icon: '🤝' },
  { id: 'numbers_list', label: 'Numbers / Lists', icon: '📊' },
  { id: 'direct_address', label: 'Direct Address', icon: '👉' },
]

interface HookTemplatesProps {
  onUseTemplate?: (text: string) => void
}

export default function HookTemplates({ onUseTemplate }: HookTemplatesProps) {
  const [filter, setFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['hook-templates', filter],
    queryFn: () =>
      hookApi.templates(filter === 'all' ? {} : { hook_type: filter }),
  })

  const templates: HookTemplateItem[] = data?.data?.items || []

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Template copied!')
    onUseTemplate?.(text)
  }

  return (
    <div className="space-y-4">
      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {HOOK_TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.id
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No templates match filter</p>
      ) : (
        <div className="grid gap-3">
          {templates.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-gray-50 rounded-lg p-4 group hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm">{t.text}</p>
                  {t.text_hindi && (
                    <p className="text-xs text-gray-400 mt-1">{t.text_hindi}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500">
                      {t.hook_type_label}
                    </span>
                    <span className="text-[10px] text-gray-400">{t.category}</span>
                    <span className="text-[10px] text-gray-400">
                      {t.platform === 'reel' ? '🎬' : t.platform === 'short' ? '▶️' : '📱'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(t.text)}
                  className="p-2 text-gray-300 group-hover:text-primary-500 transition-colors"
                  title="Copy template"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-300 text-center">
        20 templates based on top 100 Indian creators' viral patterns
      </p>
    </div>
  )
}
