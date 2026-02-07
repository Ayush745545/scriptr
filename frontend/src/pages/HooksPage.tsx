/**
 * HooksPage — AI Hook Generator
 *
 * The most critical 3 seconds of any reel.
 * Features:
 * - Generate 5 hook variations with performance prediction
 * - 5 hook types: curiosity gap, contrarian, relatable, numbers, direct
 * - Swipeable cards with A/B vote (swipe right = worked, left = failed)
 * - 20 proven Indian templates
 * - Community leaderboard (crowdsource what works)
 */

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  hookApi,
  HookVariation,
  HookGenerateRequest,
  HookTypeInfo,
} from '../services/api'
import SwipeableHookCard from '../components/hooks/SwipeableHookCard'
import HookLeaderboard from '../components/hooks/HookLeaderboard'
import HookTemplates from '../components/hooks/HookTemplates'

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'lifestyle', label: 'Lifestyle', icon: '✨' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { value: 'motivation', label: 'Motivation', icon: '🔥' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'food', label: 'Food', icon: '🍲' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'tech', label: 'Tech', icon: '📱' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
]

type Tab = 'generate' | 'templates' | 'leaderboard'

export default function HooksPage() {
  const [tab, setTab] = useState<Tab>('generate')
  const [formData, setFormData] = useState<HookGenerateRequest>({
    topic: '',
    target_audience: '',
    platform: 'reel',
    language: 'hinglish',
    category: 'lifestyle',
    count: 5,
  })
  const [generatedHooks, setGeneratedHooks] = useState<HookVariation[]>([])

  // Fetch hook types
  const { data: typesData } = useQuery({
    queryKey: ['hook-types'],
    queryFn: () => hookApi.types(),
  })
  const hookTypes: HookTypeInfo[] = typesData?.data?.types || []

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: (data: HookGenerateRequest) => hookApi.generate(data),
    onSuccess: (response) => {
      const resp = response.data
      setGeneratedHooks(resp.hooks)
      toast.success(`⚡ ${resp.hooks.length} hooks generated!`)
    },
    onError: () => {
      toast.error('Failed to generate hooks. Is the backend running?')
    },
  })

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.topic.trim()) {
      toast.error('Enter a topic first!')
      return
    }
    generateMutation.mutate(formData)
  }

  const handleVote = (hookId: string, result: 'worked' | 'failed') => {
    // Update local state optimistically
    setGeneratedHooks((prev) =>
      prev.map((h) => {
        if (h.id === hookId) {
          const newTested = h.times_tested + 1
          const newWorked = h.times_worked + (result === 'worked' ? 1 : 0)
          const newFailed = h.times_failed + (result === 'failed' ? 1 : 0)
          return {
            ...h,
            times_tested: newTested,
            times_worked: newWorked,
            times_failed: newFailed,
            ab_score: newTested > 0 ? Math.round((newWorked / newTested) * 100) : null,
          }
        }
        return h
      })
    )
  }

  // Avg score of generated batch
  const avgScore = generatedHooks.length > 0
    ? Math.round(generatedHooks.reduce((sum, h) => sum + h.predicted_score, 0) / generatedHooks.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          ⚡ Hook Generator
        </h1>
        <p className="text-gray-600 mt-1">
          The most critical 3 seconds of any reel. Generate scroll-stopping hooks for Indian audiences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-lg">
        {[
          { key: 'generate' as Tab, label: '✍️ Generate', desc: 'AI-powered hooks' },
          { key: 'templates' as Tab, label: '📋 Templates', desc: '20 proven formulas' },
          { key: 'leaderboard' as Tab, label: '🏆 Leaderboard', desc: 'Community votes' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ══════════════ GENERATE TAB ══════════════ */}
        {tab === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="grid lg:grid-cols-5 gap-6">
              {/* Left panel — Form */}
              <div className="lg:col-span-2 space-y-4">
                <form onSubmit={handleGenerate} className="space-y-4">
                  {/* Topic */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      What's your reel about? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g., Morning routine tips for students, Best street food in Delhi under ₹100"
                      className="input-field min-h-[90px] text-sm"
                      required
                    />
                  </motion.div>

                  {/* Target audience */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Target Audience
                    </label>
                    <input
                      value={formData.target_audience}
                      onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                      placeholder="e.g., Delhi college students, small business owners, homemakers 30-45"
                      className="input-field text-sm"
                    />
                  </motion.div>

                  {/* Category */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Category
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`p-2 rounded-lg border text-center transition-all text-xs ${
                            formData.category === cat.value
                              ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span className="block text-base">{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Platform + Language */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-xl border border-gray-200 p-5"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          Platform
                        </label>
                        <div className="flex gap-2">
                          {[
                            { value: 'reel', label: '🎬 Reel' },
                            { value: 'short', label: '▶️ Short' },
                          ].map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, platform: p.value as 'reel' | 'short' })}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                formData.platform === p.value
                                  ? 'bg-primary-500 text-white border-primary-500'
                                  : 'border-gray-200 text-gray-600'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                          Language
                        </label>
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value as 'hi' | 'en' | 'hinglish' })}
                          className="input-field text-sm"
                        >
                          <option value="hinglish">Hinglish</option>
                          <option value="hi">हिंदी</option>
                          <option value="en">English</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>

                  {/* Generate button */}
                  <button
                    type="submit"
                    disabled={!formData.topic.trim() || generateMutation.isPending}
                    className="btn-primary w-full py-3 text-base disabled:opacity-50"
                  >
                    {generateMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating 5 Hooks...
                      </span>
                    ) : (
                      '⚡ Generate 5 Hook Variations'
                    )}
                  </button>
                </form>

                {/* Hook types reference */}
                {hookTypes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-5"
                  >
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      5 Hook Types That Work
                    </h3>
                    <div className="space-y-2.5">
                      {hookTypes.map((ht) => (
                        <div key={ht.id} className="text-xs">
                          <span className="font-medium text-gray-700">
                            {ht.label_en}
                          </span>
                          <span className="text-gray-400 ml-1">({ht.label_hi})</span>
                          <p className="text-gray-400 mt-0.5 italic">{ht.description}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right panel — Results */}
              <div className="lg:col-span-3 space-y-4">
                {generatedHooks.length > 0 ? (
                  <>
                    {/* Batch summary */}
                    <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-200 p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {generatedHooks.length} Hooks Generated
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Swipe right = worked, left = didn't work
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary-600">{avgScore}</span>
                        <p className="text-xs text-gray-400">avg score</p>
                      </div>
                    </div>

                    {/* Swipeable hook cards */}
                    <div className="space-y-4">
                      {generatedHooks.map((hook, i) => (
                        <SwipeableHookCard
                          key={hook.id || `hook-${i}`}
                          hook={hook}
                          index={i}
                          onVote={handleVote}
                          showABControls={true}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-xl border border-gray-200 p-12 text-center"
                  >
                    <p className="text-6xl mb-4">⚡</p>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Generate your first hooks
                    </h3>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                      Enter a topic on the left, pick your audience & platform, and we'll create 5
                      scroll-stopping hooks with AI performance predictions.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {['Curiosity Gap', 'Contrarian', 'Relatable', 'Numbers', 'Direct Address'].map((t) => (
                        <span key={t} className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════ TEMPLATES TAB ══════════════ */}
        {tab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-3xl"
          >
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900">
                20 Proven Hook Templates for Indian Audiences
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Analysed from top 100 Indian creators — Dhruv Rathee, Kusha Kapila, Warikoo, Beer Biceps,
                Technical Guruji, and more. Copy any template and fill in the {'{placeholders}'}.
              </p>
            </div>
            <HookTemplates
              onUseTemplate={(text) => {
                setFormData({ ...formData, topic: text })
                setTab('generate')
              }}
            />
          </motion.div>
        )}

        {/* ══════════════ LEADERBOARD TAB ══════════════ */}
        {tab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-3xl"
          >
            <HookLeaderboard />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-accent-500 to-accent-600 rounded-xl p-6 text-white"
      >
        <h3 className="text-lg font-semibold mb-3">💡 The First 3 Seconds Rule</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <h4 className="font-medium">Create a Gap</h4>
            <p className="text-sm text-accent-100 mt-1">Make them NEED to know what comes next</p>
          </div>
          <div>
            <h4 className="font-medium">Be Specific</h4>
            <p className="text-sm text-accent-100 mt-1">₹500, 3 tips, Delhi — specifics {'>'} generic</p>
          </div>
          <div>
            <h4 className="font-medium">Speak Their Language</h4>
            <p className="text-sm text-accent-100 mt-1">Hinglish converts 2x better than pure English</p>
          </div>
          <div>
            <h4 className="font-medium">Test & Track</h4>
            <p className="text-sm text-accent-100 mt-1">Use A/B voting to learn what actually works</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
