import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { projectApi, ProjectResponse } from '../services/api'

export default function ProjectsPage() {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
  })
  const [showCreateModal, setShowCreateModal] = useState(false)

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', filters],
    queryFn: () => projectApi.list(filters),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; category?: string }) =>
      projectApi.create(data),
    onSuccess: () => {
      toast.success('Project created!')
      setShowCreateModal(false)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: () => {
      toast.error('Failed to create project')
    },
  })

  const projects = data?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Organize your content in projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary whitespace-nowrap"
        >
          <span className="mr-2">+</span>
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              placeholder="Search projects..."
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white rounded-xl border border-red-200">
          <p className="text-red-600">Failed to load projects. Please try again.</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="text-gray-500 mt-1">Create your first project to organize your content</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-block mt-4"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: ProjectResponse, index: number) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}

interface ProjectCardProps {
  project: ProjectResponse
  index: number
}

function ProjectCard({ project, index }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/projects/${project.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
      >
        {/* Cover */}
        <div className="aspect-video bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg mb-4 flex items-center justify-center">
          {project.cover_image_url ? (
            <img
              src={project.cover_image_url}
              alt={project.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <span className="text-4xl">📁</span>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900">{project.name}</h3>
          <span className={`px-2 py-1 text-xs rounded-full capitalize ${statusColors[project.status] || 'bg-gray-100 text-gray-700'}`}>
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {project.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {project.scripts_count} scripts
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            {project.captions_count} captions
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {project.thumbnails_count}
          </span>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {project.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>
    </motion.div>
  )
}

interface CreateProjectModalProps {
  onClose: () => void
  onCreate: (data: { name: string; description?: string; category?: string }) => void
  isLoading: boolean
}

function CreateProjectModal({ onClose, onCreate, isLoading }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a project name')
      return
    }
    onCreate({ name, description: description || undefined, category: category || undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Project</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="input-field"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              className="input-field"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-field"
            >
              <option value="">Select a category</option>
              <option value="entertainment">Entertainment</option>
              <option value="education">Education</option>
              <option value="business">Business</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="food">Food</option>
              <option value="fitness">Fitness</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
