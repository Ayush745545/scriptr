/**
 * HookLeaderboard — shows community-voted top-performing hooks.
 * Crowdsourced A/B data: which hooks actually worked for creators.
 */

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { hookApi, HookLeaderboardEntry } from '../../services/api'

const HOOK_TYPE_ICONS: Record<string, string> = {
  curiosity_gap: '🔮',
  contrarian: '🔥',
  relatable_struggle: '🤝',
  numbers_list: '📊',
  direct_address: '👉',
}

function WinRateBar({ score, tested }: { score: number; tested: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400'
          }`}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 w-16 text-right">
        {score}% ({tested})
      </span>
    </div>
  )
}

export default function HookLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['hook-leaderboard'],
    queryFn: () => hookApi.leaderboard(20),
  })

  const entries: HookLeaderboardEntry[] = data?.data?.entries || []
  const totalVotes = data?.data?.total_votes || 0

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              🏆 Community Leaderboard
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Hooks ranked by real creator results
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-amber-600">{totalVotes.toLocaleString()}</span>
            <p className="text-xs text-gray-400">total votes</p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">🗳️</p>
          <p className="font-medium">No votes yet</p>
          <p className="text-sm mt-1">
            Generate hooks and mark which ones worked to build the leaderboard!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Rank */}
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-amber-400 text-white' :
                  i === 1 ? 'bg-gray-300 text-white' :
                  i === 2 ? 'bg-amber-600 text-white' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {i + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm leading-snug truncate">
                    {entry.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-400">
                      {HOOK_TYPE_ICONS[entry.hook_type] || '💬'} {entry.hook_type.replace('_', ' ')}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{entry.category}</span>
                  </div>
                  <div className="mt-2">
                    <WinRateBar score={entry.ab_score} tested={entry.times_tested} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
