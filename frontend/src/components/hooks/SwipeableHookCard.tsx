/**
 * SwipeableHookCard — a drag/swipe-able hook card with:
 * - Performance score ring
 * - Hook type badge
 * - Copy button
 * - Swipe right = "worked", swipe left = "didn't work" (A/B vote)
 * - Hindi/English toggle
 */

import { useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  PanInfo,
} from 'framer-motion'
import toast from 'react-hot-toast'
import { HookVariation, hookApi } from '../../services/api'

const HOOK_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  curiosity_gap: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔮' },
  contrarian: { bg: 'bg-red-100', text: 'text-red-700', icon: '🔥' },
  relatable_struggle: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🤝' },
  numbers_list: { bg: 'bg-green-100', text: 'text-green-700', icon: '📊' },
  direct_address: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '👉' },
}

function getScoreColor(score: number) {
  if (score >= 90) return '#22c55e' // green
  if (score >= 75) return '#f59e0b' // amber
  if (score >= 60) return '#f97316' // orange
  return '#ef4444' // red
}

interface SwipeableHookCardProps {
  hook: HookVariation
  index: number
  onVote?: (hookId: string, result: 'worked' | 'failed') => void
  onCopy?: (text: string) => void
  showABControls?: boolean
}

export default function SwipeableHookCard({
  hook,
  index,
  onVote,
  onCopy,
  showABControls = true,
}: SwipeableHookCardProps) {
  const [showHindi, setShowHindi] = useState(false)
  const [voted, setVoted] = useState<'worked' | 'failed' | null>(null)
  const [swiped, setSwiped] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const bgLeft = useTransform(x, [-200, -50, 0], [1, 0.5, 0])
  const bgRight = useTransform(x, [0, 50, 200], [0, 0.5, 1])

  const typeInfo = HOOK_TYPE_COLORS[hook.hook_type] || HOOK_TYPE_COLORS.curiosity_gap
  const scoreColor = getScoreColor(hook.predicted_score)

  // Circumference for the score ring (radius=22)
  const circumference = 2 * Math.PI * 22
  const strokeDashoffset = circumference - (hook.predicted_score / 100) * circumference

  const handleCopy = () => {
    const text = showHindi && hook.text_hindi ? hook.text_hindi : hook.text
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard! 📋')
    onCopy?.(text)

    // Track usage if we have an ID
    if (hook.id) {
      hookApi.trackUsage(hook.id).catch(() => {})
    }
  }

  const handleVote = async (result: 'worked' | 'failed') => {
    if (!hook.id || voted) return
    setVoted(result)
    onVote?.(hook.id, result)
    try {
      await hookApi.vote(hook.id, { result })
      toast.success(result === 'worked' ? '✅ Marked as worked!' : '❌ Marked as failed')
    } catch {
      toast.error('Could not record vote')
    }
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 120) {
      const result = info.offset.x > 0 ? 'worked' : 'failed'
      setSwiped(true)
      handleVote(result as 'worked' | 'failed')
    }
  }

  const displayText = showHindi && hook.text_hindi ? hook.text_hindi : hook.text

  return (
    <AnimatePresence>
      {!swiped && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: voted === 'worked' ? 300 : -300, rotate: voted === 'worked' ? 20 : -20 }}
          transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
          style={{ x, rotate }}
          drag={showABControls ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="relative select-none"
        >
          {/* Swipe indicators */}
          {showABControls && (
            <>
              <motion.div
                style={{ opacity: bgRight }}
                className="absolute inset-0 bg-green-100 rounded-xl z-0 pointer-events-none flex items-center justify-end pr-6"
              >
                <span className="text-green-600 font-bold text-lg">✅ Worked</span>
              </motion.div>
              <motion.div
                style={{ opacity: bgLeft }}
                className="absolute inset-0 bg-red-100 rounded-xl z-0 pointer-events-none flex items-center pl-6"
              >
                <span className="text-red-600 font-bold text-lg">❌ Failed</span>
              </motion.div>
            </>
          )}

          {/* Card body */}
          <div className="relative z-10 bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
            <div className="flex items-start gap-4">
              {/* Score ring */}
              <div className="flex-shrink-0 relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 50 50">
                  <circle cx="25" cy="25" r="22" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="25"
                    cy="25"
                    r="22"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                  style={{ color: scoreColor }}
                >
                  {Math.round(hook.predicted_score)}
                </span>
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium text-lg leading-snug">
                  {displayText}
                </p>

                {/* Secondary translation */}
                {hook.text_english && hook.text !== hook.text_english && (
                  <p className="text-sm text-gray-400 mt-1 italic">
                    {showHindi ? hook.text : hook.text_english}
                  </p>
                )}

                {/* Reasoning */}
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  💡 {hook.predicted_reasoning}
                </p>

                {/* Badges row */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.text}`}>
                    {typeInfo.icon} {hook.hook_type_label || hook.hook_type.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    {hook.platform === 'reel' ? '🎬 Reel' : hook.platform === 'short' ? '▶️ Short' : '📱 Both'}
                  </span>

                  {/* A/B stats (if exists) */}
                  {hook.times_tested > 0 && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                      {hook.ab_score != null ? `${hook.ab_score}% win` : ''} · {hook.times_tested} tested
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleCopy}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Copy hook"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                {hook.text_hindi && (
                  <button
                    onClick={() => setShowHindi(!showHindi)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-xs font-bold"
                    title="Toggle Hindi/English"
                  >
                    {showHindi ? 'EN' : 'हि'}
                  </button>
                )}
              </div>
            </div>

            {/* A/B buttons (mobile fallback for swipe) */}
            {showABControls && !voted && hook.id && (
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleVote('worked')}
                  className="flex-1 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  ✅ Worked
                </button>
                <button
                  onClick={() => handleVote('failed')}
                  className="flex-1 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  ❌ Didn't Work
                </button>
              </div>
            )}

            {voted && (
              <div className={`mt-4 pt-3 border-t border-gray-100 text-center text-sm font-medium ${
                voted === 'worked' ? 'text-green-600' : 'text-red-600'
              }`}>
                {voted === 'worked' ? '✅ Marked as worked!' : '❌ Marked as failed'} — Thanks for voting!
              </div>
            )}

            {/* Swipe hint */}
            {showABControls && !voted && hook.id && (
              <p className="text-[10px] text-gray-300 text-center mt-2">
                ← Swipe left = failed · Swipe right = worked →
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
