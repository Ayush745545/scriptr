import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { templateApi, TemplateResponse } from '../services/api'
import { Search, Star, Play } from 'lucide-react'

const categories = [
  { value: '', label: 'All', icon: '🎯' },
  { value: 'festival', label: 'Festival', labelHi: 'त्योहार', icon: '🪔' },
  { value: 'food', label: 'Food', labelHi: 'खाना', icon: '🍲' },
  { value: 'fitness', label: 'Fitness', labelHi: 'फिटनेस', icon: '💪' },
  { value: 'business', label: 'Business', labelHi: 'व्यापार', icon: '💼' },
  { value: 'lifestyle', label: 'Lifestyle', labelHi: 'जीवनशैली', icon: '✨' },
  { value: 'travel', label: 'Travel', labelHi: 'यात्रा', icon: '✈️' },
  { value: 'education', label: 'Education', labelHi: 'शिक्षा', icon: '📚' },
  { value: 'motivation', label: 'Motivation', labelHi: 'प्रेरणा', icon: '🔥' },
  { value: 'entertainment', label: 'Entertainment', labelHi: 'मनोरंजन', icon: '🎭' },
  { value: 'product', label: 'Product', labelHi: 'उत्पाद', icon: '📦' },
]

export default function TemplatesPage() {
  const [filters, setFilters] = useState({
    category: '',
    aspect_ratio: '',
    is_featured: undefined as boolean | undefined,
    search: '',
    page: 1,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['templates', filters],
    queryFn: () => templateApi.list(filters),
  })

  const { data: featuredData } = useQuery({
    queryKey: ['templates-featured'],
    queryFn: () => templateApi.featured(),
  })

  const templates = data?.data?.items || []
  const featuredTemplates = featuredData?.data?.items || []
  const hasMore = data?.data?.has_more || false

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Reel Templates</h1>
          <p className="text-text-secondary">
            Professional templates for festivals, food, fitness, and more
          </p>
        </div>
      </div>

      {/* Featured Templates */}
      {featuredTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Star className="text-accent fill-accent" size={20} />
            <h2 className="text-xl font-semibold text-white">Featured Templates</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredTemplates.slice(0, 5).map((template: TemplateResponse, index: number) => (
              <TemplateCard key={template.id} template={template} index={index} featured />
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar - Glass */}
      <div className="glass p-1 rounded-2xl sticky top-[80px] z-30">
        <div className="bg-background/60 backdrop-blur-md rounded-xl p-4 space-y-4">
          {/* Search & Main Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                placeholder="Search templates..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-text-tertiary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <select
                value={filters.aspect_ratio}
                onChange={(e) => setFilters({ ...filters, aspect_ratio: e.target.value, page: 1 })}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-text-secondary focus:outline-none focus:border-accent/50"
              >
                <option value="">All Ratios</option>
                <option value="9:16">9:16 (Reels)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="16:9">16:9 (Video)</option>
              </select>

              <button
                onClick={() => setFilters({ ...filters, is_featured: filters.is_featured ? undefined : true })}
                className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all ${filters.is_featured ? 'bg-accent text-white border-accent' : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'}`}
              >
                <Star size={16} className={filters.is_featured ? 'fill-current' : ''} />
                Featured Only
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilters({ ...filters, category: cat.value, page: 1 })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${filters.category === cat.value
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                  }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500 bg-red-500/10 rounded-3xl border border-red-500/20">
          Failed to load templates. Please try again.
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
          <div className="text-5xl mb-4">🎨</div>
          <h3 className="text-lg font-medium text-white">No templates found</h3>
          <p className="text-text-tertiary mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {templates.map((template: TemplateResponse, index: number) => (
            <TemplateCard key={template.id} template={template} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {templates.length > 0 && (
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

interface TemplateCardProps {
  template: TemplateResponse
  index: number
  featured?: boolean
}

function TemplateCard({ template, index, featured }: TemplateCardProps) {
  const categoryIcons: Record<string, string> = {
    festival: '🪔',
    food: '🍲',
    fitness: '💪',
    business: '💼',
    lifestyle: '✨',
    travel: '✈️',
    education: '📚',
    motivation: '🔥',
    entertainment: '🎭',
    product: '📦',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/templates/${template.id}`}
        className="group block glass-card rounded-2xl overflow-hidden hover:border-accent/50 transition-all duration-300"
      >
        {/* Preview */}
        <div className="relative aspect-[9/16] bg-surface/50 overflow-hidden">
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-background">
              <span className="text-5xl opacity-50">{categoryIcons[template.category] || '🎨'}</span>
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Play className="fill-white text-white ml-1" size={24} />
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {featured && (
              <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">
                Featured
              </span>
            )}
            {template.is_premium && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-lg">
                Pro
              </span>
            )}
          </div>

          {/* Aspect Ratio Badge */}
          <div className="absolute top-2 right-2">
            <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white/80 text-[10px] rounded">
              {template.aspect_ratio || '9:16'}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-white truncate text-sm">{template.name}</h3>
          <p className="text-xs text-text-tertiary truncate mt-0.5 capitalize">{template.category}</p>
        </div>
      </Link>
    </motion.div>
  )
}
