import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  captionApi,
  CaptionResponse,
} from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { Upload, X, FileVideo, Check, Loader2 } from 'lucide-react'

interface VideoCaptionUploaderProps {
  onUploadComplete?: (caption: CaptionResponse) => void
}

export default function VideoCaptionUploader({ onUploadComplete }: VideoCaptionUploaderProps) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('auto')
  const [wordTimestamps, setWordTimestamps] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [step, setStep] = useState(1); // 1: Upload, 2: Config

  // Fetch styles
  const { data: stylesData } = useQuery({
    queryKey: ['caption-styles'],
    queryFn: captionApi.getStyles,
  })

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('title', title || uploadFile.name)
      formData.append('language_hint', language)
      formData.append('word_timestamps', String(wordTimestamps))
      if (selectedStyle) {
        formData.append('style_preset_id', selectedStyle)
      }

      const response = await captionApi.upload(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 100)
        )
        setUploadProgress(percentCompleted)
      })

      return response.data
    },
    onSuccess: (data) => {
      toast.success('Video uploaded! Processing captions...')
      setFile(null)
      setUploadProgress(0)
      if (onUploadComplete) {
        onUploadComplete(data)
      } else {
        navigate(`/captions/${data.id}`)
      }
    },
    onError: (error) => {
      toast.error('Upload failed. Please try again.')
      setUploadProgress(0)
      console.error(error)
    },
  })

  // Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (file: File) => {
    const validTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'audio/mpeg', 'audio/wav']
    const maxSize = 100 * 1024 * 1024 // 100MB

    if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
      toast.error('Please upload MP4, MOV, or MP3 file')
      return
    }

    if (file.size > maxSize) {
      toast.error('File size too large (max 100MB)')
      return
    }

    setFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""))
    setStep(2) // Move to config step
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    uploadMutation.mutate(file)
  }

  const styles = stylesData?.data.styles || {}

  return (
    <div className="w-full">
      {step === 1 && (
        <div
          className={`relative border-2 border-dashed rounded-[32px] p-12 text-center transition-all cursor-pointer group ${dragActive
            ? 'border-accent bg-accent/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
            accept=".mp4,.mov,.mp3,.wav"
          />

          <div className="flex flex-col items-center space-y-4 relative z-10">
            <div className="w-20 h-20 rounded-full bg-surface/80 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Upload className="text-accent w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Upload Video</h3>
              <p className="text-text-secondary max-w-sm mx-auto">
                Drag & drop MP4 or MOV files here, or click to browse (Max 100MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {step === 2 && file && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8 p-6 md:p-8"
        >
          {/* File Info */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
                <FileVideo className="text-accent" />
              </div>
              <div>
                <h4 className="text-white font-medium truncate max-w-xs">{file.name}</h4>
                <p className="text-sm text-text-tertiary">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>
            <button
              onClick={() => { setFile(null); setStep(1); setUploadProgress(0); }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-tertiary hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Settings */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary uppercase tracking-wider pl-1">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass-input w-full p-4 rounded-xl text-white outline-none"
                  placeholder="e.g. My Viral Video"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary uppercase tracking-wider pl-1">Language</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLanguage('auto')}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${language === 'auto' ? 'bg-accent/20 text-accent border-accent' : 'bg-surface/50 text-text-secondary border-transparent hover:bg-surface'}`}
                  >
                    Auto-Detect
                  </button>
                  <button
                    onClick={() => setLanguage('hinglish')}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${language === 'hinglish' ? 'bg-accent/20 text-accent border-accent' : 'bg-surface/50 text-text-secondary border-transparent hover:bg-surface'}`}
                  >
                    Hinglish
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-xl bg-white/5 border border-white/5">
                <input
                  type="checkbox"
                  id="timestamps"
                  checked={wordTimestamps}
                  onChange={(e) => setWordTimestamps(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-surface/50 text-accent focus:ring-accent"
                />
                <label htmlFor="timestamps" className="cursor-pointer">
                  <span className="block font-medium text-white">Karaoke Highlights</span>
                  <span className="block text-xs text-text-tertiary">Animate active words like Instagram Reels</span>
                </label>
              </div>
            </div>

            {/* Styles */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-text-secondary uppercase tracking-wider pl-1">Caption Style</label>
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                {Object.values(styles).map((style: any) => (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`cursor-pointer p-3 rounded-xl border transition-all ${selectedStyle === style.id
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 bg-surface/30 hover:bg-surface/50'
                      }`}
                  >
                    <div
                      className="h-16 flex items-center justify-center rounded-lg mb-2 overflow-hidden text-xs"
                      style={{
                        backgroundColor: style.background_color === 'transparent' ? '#1c1c1e' : style.background_color,
                      }}
                    >
                      <span style={{
                        fontFamily: style.font_family,
                        fontWeight: style.font_weight,
                        color: style.color,
                        textTransform: style.text_transform,
                        textShadow: style.text_shadow,
                      }}>
                        {style.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-white truncate">{style.name}</p>
                      {selectedStyle === style.id && <Check size={12} className="text-accent" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            {uploadMutation.isPending ? (
              <div className="space-y-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-text-tertiary flex items-center justify-center">
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  Extracting Audio... {uploadProgress}%
                </p>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-accent text-white rounded-2xl font-bold text-lg hover:bg-accent-hover transition-colors shadow-glow hover:shadow-[0_0_30px_rgba(255,149,0,0.5)] active:scale-[0.98]"
              >
                Generate Captions
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

