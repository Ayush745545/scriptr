/**
 * FormulaCards — Display the 5 Indian-niche thumbnail formulas
 *
 * Each card shows:
 * - Name (English + Hindi)
 * - Description
 * - Niche tags
 * - Example text
 * - Suggested emojis
 * - Click to apply formula
 */

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { thumbnailApi, ThumbnailFormula } from '../../services/api'

interface FormulaCardsProps {
  selected: string | null
  onSelect: (formula: ThumbnailFormula) => void
}

const NICHE_COLORS: Record<string, string> = {
  tech: 'bg-blue-100 text-blue-700',
  reaction: 'bg-red-100 text-red-700',
  unboxing: 'bg-purple-100 text-purple-700',
  vlog: 'bg-pink-100 text-pink-700',
  fitness: 'bg-green-100 text-green-700',
  beauty: 'bg-rose-100 text-rose-700',
  home: 'bg-amber-100 text-amber-700',
  transformation: 'bg-teal-100 text-teal-700',
  education: 'bg-indigo-100 text-indigo-700',
  finance: 'bg-emerald-100 text-emerald-700',
  business: 'bg-slate-100 text-slate-700',
  tips: 'bg-cyan-100 text-cyan-700',
  motivation: 'bg-violet-100 text-violet-700',
  poetry: 'bg-fuchsia-100 text-fuchsia-700',
  quotes: 'bg-yellow-100 text-yellow-700',
  podcast: 'bg-orange-100 text-orange-700',
  food: 'bg-red-100 text-red-700',
  street_food: 'bg-orange-100 text-orange-700',
  restaurant: 'bg-amber-100 text-amber-700',
  recipe: 'bg-lime-100 text-lime-700',
}

const FORMULA_ICONS: Record<string, string> = {
  shocked_face_arrow: '😱',
  before_after_split: '🔄',
  text_heavy_listicle: '📌',
  minimal_gradient: '🌟',
  food_closeup_badge: '🍛',
}

export default function FormulaCards({ selected, onSelect }: FormulaCardsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['thumbnail-formulas'],
    queryFn: () => thumbnailApi.formulas(),
    staleTime: 10 * 60 * 1000,
  })

  const formulas: ThumbnailFormula[] = data?.data || []

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {formulas.map((formula) => {
        const isActive = selected === formula.id
        return (
          <motion.button
            key={formula.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(formula)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              isActive
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-2xl">{FORMULA_ICONS[formula.id] || '📐'}</span>
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                  {formula.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">{formula.name_hi}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{formula.description}</p>

            {/* Example */}
            <div className="bg-gray-50 rounded-lg px-2 py-1.5 mb-2">
              <p className="text-xs font-medium text-gray-800 hindi-text">
                "{formula.example_text}"
              </p>
              <p className="text-[10px] text-gray-400">{formula.example_text_en}</p>
            </div>

            {/* Niche tags */}
            <div className="flex flex-wrap gap-1 mb-1.5">
              {formula.niche.map((n) => (
                <span
                  key={n}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    NICHE_COLORS[n] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>

            {/* Suggested emojis */}
            <div className="flex gap-1">
              {formula.suggested_emojis.map((e, i) => (
                <span key={i} className="text-sm">
                  {e}
                </span>
              ))}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
