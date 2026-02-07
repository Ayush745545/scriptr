import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { thumbnailApi, ThumbnailResponse } from '../services/api'
import { Plus, Download, Eye, Loader2 } from 'lucide-react'

const styles = [
  { value: '', label: 'All Styles' },
  { value: 'bold', label: 'Bold & Colorful' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'youtube', label: 'YouTube Style' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'neon', label: 'Neon' },
  { value: 'traditional', label: 'Traditional Indian' },
]

export default function ThumbnailsPage() {
  const [filters, setFilters] = useState({
    style: '',
    status: '',
    page: 1,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['thumbnails', filters],
    queryFn: () => thumbnailApi.list(filters),
  })

  const thumbnails = data?.data?.items || []
  const hasMore = data?.data?.has_more || false

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Thumbnails</h1>
          <p className="text-text-secondary">
            Create click-worthy thumbnails with Hindi text support
          </p>
        </div>
        <Link
          to="/thumbnails/new"
          className="inline-flex items-center px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
        >
          <Plus size={20} className="mr-2" />
          Create Thumbnail
        </Link>
      </div>

      {/* Quick Create Cards - Glass */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { style: 'bold', label: 'Bold & Colorful', icon: '🎨', color: 'from-orange-500/20 to-red-500/20' },
          { style: 'minimal', label: 'Minimal Clean', icon: '✨', color: 'from-blue-500/20 to-cyan-500/20' },
          { style: 'youtube', label: 'YouTube Style', icon: '📺', color: 'from-red-500/20 to-pink-500/20' },
          { style: 'traditional', label: 'Traditional Indian', icon: '🪔', color: 'from-amber-500/20 to-orange-500/20' },
        ].map((card) => (
          <Link
            key={card.style}
            to={`/thumbnails/new?style=${card.style}`}
            className="group relative overflow-hidden rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative p-6 bg-surface/40 backdrop-blur-md h-full group-hover:bg-surface/20 transition-colors">
              <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">{card.icon}</div>
              <h3 className="font-bold text-white text-lg">{card.label}</h3>
              <p className="text-xs text-text-tertiary mt-2 flex items-center group-hover:text-white transition-colors">
                Start creating <span className="ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">→</span>
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Filters - Glass Bar */}
      <div className="glass p-1 rounded-2xl sticky top-[80px] z-30">
        <div className="bg-background/60 backdrop-blur-md rounded-xl p-2 flex flex-wrap gap-2">
          <select
            value={filters.style}
            onChange={(e) => setFilters({ ...filters, style: e.target.value, page: 1 })}
            className="bg-transparent text-white px-4 py-2 rounded-lg border border-transparent hover:bg-white/5 focus:bg-white/10 outline-none cursor-pointer"
          >
            {styles.map((style) => (
              <option key={style.value} value={style.value} className="bg-surface text-white">
                {style.label}
              </option>
            ))}
          </select>

          <div className="w-px h-8 bg-white/10 my-auto" />

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="bg-transparent text-white px-4 py-2 rounded-lg border border-transparent hover:bg-white/5 focus:bg-white/10 outline-none cursor-pointer"
          >
            <option value="" className="bg-surface text-white">All Status</option>
            <option value="pending" className="bg-surface text-white">Pending</option>
            <option value="generating" className="bg-surface text-white">Generating</option>
            <option value="completed" className="bg-surface text-white">Completed</option>
            <option value="failed" className="bg-surface text-white">Failed</option>
          </select>
        </div>
      </div>

      {/* Thumbnails Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 bg-red-500/10 rounded-3xl border border-red-500/20">
          Failed to load thumbnails. Please try again.
        </div>
      ) : thumbnails.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 mx-auto max-w-lg">
          <div className="text-5xl mb-6">🖼️</div>
          <h3 className="text-xl font-bold text-white mb-2">No thumbnails yet</h3>
          <p className="text-text-secondary mb-6">Create your first eye-catching thumbnail to get started</p>
          <Link to="/thumbnails/new" className="px-8 py-3 bg-accent text-white rounded-full font-bold hover:bg-accent-hover transition-colors shadow-glow">
            Create Thumbnail
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {thumbnails.map((thumbnail: ThumbnailResponse, index: number) => (
            <ThumbnailCard key={thumbnail.id} thumbnail={thumbnail} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {thumbnails.length > 0 && (
        <div className="flex items-center justify-between pt-8 border-t border-white/10">
          <button
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            disabled={filters.page === 1}
            className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all"
          >
            Previous
          </button>
          <span className="text-text-secondary">Page {filters.page}</span>
          <button
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            disabled={!hasMore}
            className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

interface ThumbnailCardProps {
  thumbnail: ThumbnailResponse
  index: number
}

function ThumbnailCard({ thumbnail, index }: ThumbnailCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    generating: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-300 border-green-500/30',
    failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/thumbnails/${thumbnail.id}`}
        className="group block glass-card rounded-2xl overflow-hidden hover:border-white/20 hover:scale-[1.02] transition-all duration-300"
      >
        {/* Preview */}
        <div className="relative aspect-video bg-surface/50">
          {thumbnail.output_url ? (
            <img
              src={thumbnail.output_url}
              alt={thumbnail.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {thumbnail.status === 'generating' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-accent" size={32} />
                  <span className="text-xs text-text-tertiary">Generating...</span>
                </div>
              ) : (
                <span className="text-4xl opacity-50">🖼️</span>
              )}
            </div>
          )}

          {/* Overlay on hover (if completed) */}
          {thumbnail.status === 'completed' && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
              <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <Eye size={20} />
              </button>
              <button className="p-2 rounded-full bg-white text-black hover:scale-110 transition-transform">
                <Download size={20} />
              </button>
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${statusColors[thumbnail.status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
              {thumbnail.status}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-medium text-white truncate text-sm">{thumbnail.title}</h3>
          <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
            <span className="capitalize px-2 py-0.5 rounded bg-white/5">{thumbnail.style || 'Custom'}</span>
            {thumbnail.download_count > 0 && <span>{thumbnail.download_count} saved</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
