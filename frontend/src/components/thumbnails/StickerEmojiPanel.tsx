/**
 * StickerEmojiPanel — Sidebar panel for adding stickers & emojis to thumbnails
 *
 * Features:
 * - Niche-based emoji suggestions (tech, food, fitness, etc.)
 * - Categorised sticker packs (Arrows, Reactions, Badges, Indian Symbols)
 * - Click to add to canvas
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { thumbnailApi } from '../../services/api'

interface StickerEmojiPanelProps {
  onEmojiClick: (emoji: string) => void
}

const NICHES = [
  { value: 'general', label: 'General' },
  { value: 'tech', label: '📱 Tech' },
  { value: 'food', label: '🍛 Food' },
  { value: 'fitness', label: '💪 Fitness' },
  { value: 'education', label: '📚 Education' },
  { value: 'motivation', label: '🙏 Motivation' },
  { value: 'beauty', label: '✨ Beauty' },
  { value: 'finance', label: '💰 Finance' },
  { value: 'vlog', label: '📸 Vlog' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'reaction', label: '😱 Reaction' },
]

const QUICK_EMOJIS = [
  '🔥', '⭐', '💯', '😱', '👆', '🚀', '✅', '💡',
  '🎯', '💪', '🙏', '😍', '🤯', '❓', '⚡', '🏆',
  '👑', '💎', '🎉', '💰', '📌', '🤩', '🥇', '🔴',
]

export default function StickerEmojiPanel({ onEmojiClick }: StickerEmojiPanelProps) {
  const [niche, setNiche] = useState('general')

  const { data: suggestions } = useQuery({
    queryKey: ['sticker-suggestions', niche],
    queryFn: () => thumbnailApi.stickerSuggestions(niche),
    staleTime: 5 * 60 * 1000,
  })

  const suggestedEmojis = suggestions?.data?.emojis || QUICK_EMOJIS.slice(0, 8)
  const stickerPacks = suggestions?.data?.sticker_packs || []

  return (
    <div className="space-y-4">
      {/* Niche selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Content Niche
        </label>
        <select
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          className="input-field text-sm"
        >
          {NICHES.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </div>

      {/* Suggested emojis */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">Suggested</h4>
        <div className="grid grid-cols-4 gap-2">
          {suggestedEmojis.map((emoji, i) => (
            <motion.button
              key={`${emoji}-${i}`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEmojiClick(emoji)}
              className="text-2xl p-2 rounded-lg hover:bg-gray-100 transition-colors text-center"
              title={`Add ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">All Emojis</h4>
        <div className="grid grid-cols-6 gap-1">
          {QUICK_EMOJIS.map((emoji, i) => (
            <button
              key={`quick-${emoji}-${i}`}
              onClick={() => onEmojiClick(emoji)}
              className="text-xl p-1.5 rounded hover:bg-gray-100 transition-colors text-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Sticker packs */}
      {stickerPacks.map((pack: { name: string; items: string[] }) => (
        <div key={pack.name}>
          <h4 className="text-xs font-medium text-gray-500 mb-2">{pack.name}</h4>
          <div className="grid grid-cols-6 gap-1">
            {pack.items.map((item, i) => (
              <button
                key={`${pack.name}-${item}-${i}`}
                onClick={() => onEmojiClick(item)}
                className="text-xl p-1.5 rounded hover:bg-gray-100 transition-colors text-center"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
