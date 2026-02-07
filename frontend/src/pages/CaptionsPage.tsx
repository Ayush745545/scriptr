import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { captionApi, CaptionResponse } from '../services/api'

export default function CaptionsPage() {
  const [filters, setFilters] = useState({
    status: '',
    page: 1,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['captions', filters],
    queryFn: () => captionApi.list(filters),
  })

  const captions = data?.data?.items || []
  const hasMore = data?.data?.has_more || false

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload - navigate to upload page with file
    console.log('Files dropped:', acceptedFiles)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a'],
    },
    multiple: false,
  })

  // react-dropzone includes a DOM `onAnimationStart` handler in the returned props,
  // which conflicts with framer-motion's `onAnimationStart` typing.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onAnimationStart: _ignored, ...safeRootProps } = getRootProps() as any

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Auto Captions</h1>
          <p className="text-gray-600 mt-1">
            Generate accurate captions for your videos
          </p>
        </div>
        <Link to="/captions/new" className="btn-primary whitespace-nowrap">
          <span className="mr-2">+</span>
          Upload Video
        </Link>
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        {...safeRootProps}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">🎬</div>
        {isDragActive ? (
          <p className="text-primary-600 font-medium">Drop your video here...</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">
              Drag & drop a video here, or click to select
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports MP4, MOV, AVI, WebM, MP3, WAV (max 500MB)
            </p>
            <p className="text-sm text-gray-400 mt-1 hindi-text">
              वीडियो अपलोड करें और कैप्शन जेनरेट करें
            </p>
          </>
        )}
      </motion.div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Captions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading captions...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-red-200">
          <p className="text-red-600">Failed to load captions. Please try again.</p>
        </div>
      ) : captions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-lg font-medium text-gray-900">No captions yet</h3>
          <p className="text-gray-500 mt-1">Upload your first video to generate captions</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {captions.map((caption: CaptionResponse, index: number) => (
            <CaptionCard key={caption.id} caption={caption} index={index} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {captions.length > 0 && (
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

interface CaptionCardProps {
  caption: CaptionResponse
  index: number
}

function CaptionCard({ caption, index }: CaptionCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/captions/${caption.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{caption.title}</h3>
              <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[caption.status] || 'bg-gray-100 text-gray-700'}`}>
                {caption.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              {caption.source_file_name}
            </p>
            {caption.transcription_text && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {caption.transcription_text.substring(0, 150)}...
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(caption.source_duration_seconds)}
              </span>
              {caption.detected_language && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  {caption.detected_language}
                </span>
              )}
              {caption.segments && (
                <span>{caption.segments.length} segments</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            {caption.status === 'processing' ? (
              <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
