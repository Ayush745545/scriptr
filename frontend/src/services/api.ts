import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        await useAuthStore.getState().refreshAccessToken()
        const newToken = useAuthStore.getState().accessToken
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch {
        useAuthStore.getState().logout()
      }
    }
    
    return Promise.reject(error)
  }
)

// Script API
export const scriptApi = {
  generate: (data: ScriptGenerateRequest) => 
    api.post<ScriptResponse>('/scripts/generate', data),
  
  list: (params?: ScriptListParams) =>
    api.get<ScriptListResponse>('/scripts', { params }),
  
  get: (id: string) =>
    api.get<ScriptResponse>(`/scripts/${id}`),
  
  update: (id: string, data: ScriptUpdateRequest) =>
    api.patch<ScriptResponse>(`/scripts/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/scripts/${id}`),
  
  regenerate: (id: string) =>
    api.post<ScriptResponse>(`/scripts/${id}/regenerate`),
}

// Enhanced Script API (with language toggle, cultural context)
export const enhancedScriptApi = {
  generate: (data: EnhancedScriptRequest) =>
    api.post<EnhancedScriptResponse>('/scripts/enhanced/generate', data),
  
  getExamples: () =>
    api.get<ExampleOutputsResponse>('/scripts/enhanced/examples'),
  
  getLanguages: () =>
    api.get('/scripts/enhanced/languages'),
  
  getTones: () =>
    api.get('/scripts/enhanced/tones'),
  
  getContentTypes: () =>
    api.get('/scripts/enhanced/content-types'),
}

// Caption API
export const captionApi = {
  getStyles: () => 
    api.get<CaptionStylesResponse>('/captions/styles'),

  generate: (data: CaptionGenerateRequest) =>
    api.post<CaptionResponse>('/captions/generate', data),
  
  upload: (formData: FormData, onUploadProgress: (progressEvent: any) => void) =>
    api.post<CaptionResponse>('/captions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),

  burn: (id: string, params?: { style_preset_id?: string; karaoke?: boolean }) =>
    api.post(`/captions/${id}/burn`, null, { params }),
  
  list: (params?: CaptionListParams) =>
    api.get<CaptionListResponse>('/captions', { params }),
  
  get: (id: string) =>
    api.get<CaptionResponse>(`/captions/${id}`),
  
  update: (id: string, data: CaptionUpdateRequest) =>
    api.patch<CaptionResponse>(`/captions/${id}`, data),
  
  export: (id: string, data: CaptionExportRequest) =>
    api.post<CaptionExportResponse>(`/captions/${id}/export`, data),
  
  delete: (id: string) =>
    api.delete(`/captions/${id}`),
}

// Template API
export const templateApi = {
  list: (params?: TemplateListParams) =>
    api.get<TemplateListResponse>('/templates', { params }),
  
  featured: () =>
    api.get<TemplateListResponse>('/templates/featured'),
  
  categories: () =>
    api.get('/templates/categories'),
  
  festivals: () =>
    api.get('/templates/festivals'),
  
  get: (id: string) =>
    api.get<TemplateResponse>(`/templates/${id}`),

  definition: (id: string) =>
    api.get<{ template_id: string; template_data: any }>(`/templates/${id}/definition`),

  uploadAsset: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ url: string; content_type?: string; filename?: string }>(
      '/templates/assets/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },
  
  use: (id: string, data: UseTemplateRequest) =>
    api.post<UserTemplateResponse>(`/templates/${id}/use`, data),
  
  render: (data: RenderTemplateRequest) =>
    api.post<RenderStatusResponse>('/templates/render', data),
  
  renderStatus: (userTemplateId: string) =>
    api.get<RenderStatusResponse>(`/templates/render/${userTemplateId}/status`),
}

// Thumbnail API
export const thumbnailApi = {
  generate: (data: ThumbnailGenerateRequest) =>
    api.post<ThumbnailResponse>('/thumbnails/generate', data),
  
  uploadFace: (formData: FormData) =>
    api.post('/thumbnails/upload-face', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  list: (params?: ThumbnailListParams) =>
    api.get<ThumbnailListResponse>('/thumbnails', { params }),
  
  get: (id: string) =>
    api.get<ThumbnailResponse>(`/thumbnails/${id}`),
  
  update: (id: string, data: ThumbnailUpdateRequest) =>
    api.patch<ThumbnailResponse>(`/thumbnails/${id}`, data),
  
  createVariant: (id: string, data: ThumbnailVariantRequest) =>
    api.post<ThumbnailResponse>(`/thumbnails/${id}/variant`, data),
  
  variants: (id: string) =>
    api.get(`/thumbnails/${id}/variants`),
  
  download: (id: string) =>
    api.post(`/thumbnails/${id}/download`),

  delete: (id: string) =>
    api.delete(`/thumbnails/${id}`),

  // v2 endpoints
  formulas: () =>
    api.get<ThumbnailFormula[]>('/thumbnails/meta/formulas'),

  fonts: (script?: string) =>
    api.get<FontInfo[]>('/thumbnails/meta/fonts', { params: script ? { script } : {} }),

  downloadCoreFonts: () =>
    api.post<{ downloaded: string[]; count: number }>('/thumbnails/meta/fonts/download'),

  stickerSuggestions: (niche: string) =>
    api.get<StickerSuggestionResponse>('/thumbnails/meta/sticker-suggestions', { params: { niche } }),

  editorRender: (data: EditorRenderRequest) =>
    api.post<EditorRenderResponse>('/thumbnails/editor/render', data),

  uploadBackground: (formData: FormData) =>
    api.post<BackgroundUploadResponse>('/thumbnails/upload-background', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// Hook API
export const hookApi = {
  generate: (data: HookGenerateRequest) =>
    api.post<HookGenerateResponse>('/hooks/generate', data),

  templates: (params?: HookTemplateParams) =>
    api.get<HookTemplatesResponse>('/hooks/templates', { params }),

  types: () =>
    api.get<{ types: HookTypeInfo[] }>('/hooks/types'),

  trending: () =>
    api.get<{ trending: HookTrendingItem[] }>('/hooks/trending'),

  leaderboard: (limit?: number) =>
    api.get<HookLeaderboardResponse>('/hooks/leaderboard', { params: limit ? { limit } : {} }),

  vote: (hookId: string, data: ABTestVoteRequest) =>
    api.post<ABTestVoteResponse>(`/hooks/${hookId}/vote`, data),

  trackUsage: (id: string) =>
    api.post(`/hooks/use/${id}`),

  history: (params?: { page?: number; page_size?: number }) =>
    api.get<HookHistoryResponse>('/hooks/history', { params }),
}

// Project API
export const projectApi = {
  create: (data: ProjectCreateRequest) =>
    api.post<ProjectResponse>('/projects', data),
  
  list: (params?: ProjectListParams) =>
    api.get('/projects', { params }),
  
  get: (id: string) =>
    api.get<ProjectResponse>(`/projects/${id}`),
  
  content: (id: string) =>
    api.get(`/projects/${id}/content`),
  
  update: (id: string, data: ProjectUpdateRequest) =>
    api.patch<ProjectResponse>(`/projects/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/projects/${id}`),
}

// Types
export interface ScriptGenerateRequest {
  topic: string
  language: 'hi' | 'en' | 'hinglish'
  script_type: 'reel' | 'short' | 'youtube' | 'podcast' | 'ad' | 'story'
  category: string
  tone?: string
  target_duration_seconds?: number
  target_audience?: string
  include_hooks?: boolean
  include_hashtags?: boolean
  additional_instructions?: string
}

export interface ScriptResponse {
  id: string
  title: string
  description?: string
  content: string
  language: string
  script_type: string
  category: string
  tone?: string
  target_duration_seconds: number
  word_count: number
  hooks?: string[]
  hashtags?: string[]
  model_used: string
  is_favorite: boolean
  times_used: number
  user_rating?: number
  created_at: string
  updated_at: string
}

export interface ScriptListParams {
  page?: number
  page_size?: number
  language?: string
  script_type?: string
  category?: string
  is_favorite?: boolean
  search?: string
}

export interface ScriptListResponse {
  items: ScriptResponse[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface ScriptUpdateRequest {
  title?: string
  content?: string
  is_favorite?: boolean
  user_rating?: number
  feedback?: string
}

// Enhanced Script Types (with language toggle and cultural context)
export interface EnhancedScriptRequest {
  topic: string
  language: 'hi' | 'en' | 'hinglish'
  content_type: 'reel' | 'short' | 'ad' | 'promo' | 'educational'
  tone: 'funny' | 'professional' | 'trendy'
  duration_seconds: number
  target_audience?: string
  include_cultural_refs?: boolean
  additional_instructions?: string
}

export interface EnhancedScriptResponse {
  id: string
  title: string
  language: string
  tone: string
  duration_seconds: number
  
  // Structured script sections
  hook: string
  main_script: string
  cta: string
  full_script: string
  
  // Extras
  alternative_hooks: string[]
  hashtags: string[]
  audio_suggestions: string[]
  timing_breakdown: {
    hook?: string
    main?: string
    cta?: string
  }
  visual_suggestions: string[]
  
  // Metadata
  word_count: number
  estimated_read_time_seconds: number
  cultural_context?: string
}

export interface ExampleOutputsResponse {
  examples: Record<string, EnhancedScriptResponse>
}

export interface CaptionGenerateRequest {
  title: string
  source_file_url: string
  language_hint?: string
  caption_style?: string
  translate_to_english?: boolean
  word_timestamps?: boolean
  project_id?: string
}

export interface CaptionResponse {
  id: string
  title: string
  source_file_url: string
  source_file_name: string
  source_duration_seconds: number
  transcription_text?: string
  segments?: CaptionSegment[]
  detected_language?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  processing_time_seconds?: number
  caption_style: string
  style_settings?: Record<string, unknown>
  exported_formats?: Record<string, string>
  is_edited: boolean
  created_at: string
  completed_at?: string
}

export interface CaptionSegment {
  segment_index: number
  start_time: number
  end_time: number
  text: string
  text_english?: string
  confidence?: number
  words?: { word: string; start: number; end: number }[]
}

export interface CaptionListParams {
  page?: number
  page_size?: number
  status?: string
}

export interface CaptionListResponse {
  items: CaptionResponse[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface CaptionUpdateRequest {
  title?: string
  segments?: CaptionSegment[]
  caption_style?: string
  style_settings?: Record<string, unknown>
}

export interface CaptionExportRequest {
  format: 'srt' | 'vtt' | 'ass' | 'json' | 'txt'
  include_translation?: boolean
  burn_into_video?: boolean
}

export interface CaptionExportResponse {
  caption_id: string
  format: string
  download_url: string
  expires_at: string
  file_size_bytes: number
}

export interface CaptionStyleConfig {
  id: string
  name: string
  description: string
  font_family: string
  font_weight: string
  text_transform: string
  color: string
  text_shadow: string
  background_color: string
  highlight_color: string
  animation: string
  position: string
}

export interface CaptionStylesResponse {
  styles: Record<string, CaptionStyleConfig>
}

export interface TemplateListParams {
  page?: number
  page_size?: number
  category?: string
  template_type?: string
  aspect_ratio?: string
  is_premium?: boolean
  is_featured?: boolean
  festival_name?: string
  search?: string
}

export interface TemplateResponse {
  id: string
  name: string
  name_hindi?: string
  description?: string
  category: string
  template_type: string
  tags?: string[]
  aspect_ratio: string
  width: number
  height: number
  duration_seconds: number
  preview_url?: string
  thumbnail_url?: string
  video_url?: string
  customizable_fields?: CustomizableField[]
  color_schemes?: ColorScheme[]
  font_options?: string[]
  is_premium: boolean
  is_featured: boolean
  usage_count: number
  rating?: number
}

export interface CustomizableField {
  field_id: string
  field_type: string
  label: string
  label_hindi?: string
  default_value?: string
  placeholder?: string
  required: boolean
}

export interface ColorScheme {
  name: string
  primary: string
  secondary: string
  background: string
  text: string
}

export interface TemplateListResponse {
  items: TemplateResponse[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface UseTemplateRequest {
  template_id: string
  title: string
  customizations: Record<string, unknown>
  project_id?: string
}

export interface UserTemplateResponse {
  id: string
  template_id: string
  title: string
  customizations: Record<string, unknown>
  output_url?: string
  thumbnail_url?: string
  status: string
  render_progress: number
  error_message?: string
  created_at: string
  rendered_at?: string
}

export interface RenderTemplateRequest {
  user_template_id: string
  output_format?: string
  quality?: string
  watermark?: boolean
}

export interface RenderStatusResponse {
  user_template_id: string
  status: string
  progress: number
  output_url?: string
  thumbnail_url?: string
  estimated_time_remaining?: number
  error_message?: string
}

export interface StickerItem {
  emoji?: string
  image_url?: string
  x: number
  y: number
  size: number
}

export interface ThumbnailGenerateRequest {
  title: string
  primary_text?: string
  secondary_text?: string
  style?: string
  primary_color?: string
  secondary_color?: string
  background_color?: string
  font_family?: string
  font_size?: number
  source_image_url?: string
  face_image_url?: string
  ai_background_prompt?: string
  generate_variants?: number
  output_sizes?: string[]
  formula_id?: string
  enhance?: boolean
  stickers?: StickerItem[]
  width?: number
  height?: number
  project_id?: string
}

export interface ThumbnailResponse {
  id: string
  title: string
  primary_text?: string
  secondary_text?: string
  style: string
  primary_color: string
  secondary_color: string
  output_url?: string
  output_variants?: { variant_index: number; url: string; sizes?: Record<string, string> }[]
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error_message?: string
  download_count: number
  created_at: string
}

export interface ThumbnailFormula {
  id: string
  name: string
  name_hi: string
  description: string
  niche: string[]
  layout: Record<string, unknown>
  suggested_emojis: string[]
  example_text: string
  example_text_en: string
}

export interface FontInfo {
  id: string
  name: string
  family: string
  script: string
  style: string
  weight: number
  preview_text: string
  available: boolean
}

export interface StickerSuggestionResponse {
  niche: string
  emojis: string[]
  sticker_packs: { name: string; items: string[] }[]
}

export interface EditorRenderRequest {
  canvas_json: {
    width: number
    height: number
    backgroundColor: string
    layers: EditorLayer[]
  }
  output_sizes: string[]
  enhance: boolean
}

export interface EditorLayer {
  type: 'image' | 'text' | 'emoji'
  src?: string
  text?: string
  emoji?: string
  x: number
  y: number
  width?: number
  height?: number
  fontSize?: number
  fontFamily?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  size?: number
  opacity?: number
}

export interface EditorRenderResponse {
  outputs: { size: string; width: number; height: number; url: string }[]
}

export interface BackgroundUploadResponse {
  url: string
  width: number
  height: number
  face_detected: boolean
  face_region: [number, number, number, number] | null
}

export interface ThumbnailListParams {
  page?: number
  page_size?: number
  status?: string
  style?: string
}

export interface ThumbnailListResponse {
  items: ThumbnailResponse[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

export interface ThumbnailUpdateRequest {
  title?: string
  primary_text?: string
  secondary_text?: string
  style?: string
  regenerate?: boolean
}

export interface ThumbnailVariantRequest {
  parent_thumbnail_id: string
  variant_name: string
  changes: Record<string, unknown>
}

export interface HookGenerateRequest {
  topic: string
  target_audience?: string
  platform?: 'reel' | 'short'
  language?: 'hi' | 'en' | 'hinglish'
  category?: string
  count?: number
}

export interface HookVariation {
  id?: string
  text: string
  text_hindi?: string
  text_english?: string
  hook_type: string
  hook_type_label?: string
  predicted_score: number
  predicted_reasoning: string
  platform: string
  times_tested: number
  times_worked: number
  times_failed: number
  ab_score?: number | null
}

export interface HookGenerateResponse {
  topic: string
  target_audience: string
  platform: string
  language: string
  category: string
  batch_id: string
  hooks: HookVariation[]
}

export interface HookTemplateParams {
  hook_type?: string
  category?: string
  platform?: string
  page?: number
  page_size?: number
}

export interface HookTemplateItem {
  id: string
  text: string
  text_hindi?: string
  text_english?: string
  hook_type: string
  hook_type_label: string
  category: string
  platform: string
  usage_count: number
  ab_score?: number | null
  times_tested: number
  times_worked: number
}

export interface HookTemplatesResponse {
  items: HookTemplateItem[]
  total: number
  page: number
  page_size: number
}

export interface HookTypeInfo {
  id: string
  label_en: string
  label_hi: string
  description: string
  examples: string[]
}

export interface HookTrendingItem {
  id: string
  text: string
  text_hindi?: string
  text_english?: string
  hook_type: string
  category: string
  platform: string
  usage_count: number
  ab_score?: number | null
  times_tested: number
}

export interface HookLeaderboardEntry {
  id: string
  text: string
  hook_type: string
  category: string
  platform: string
  ab_score: number
  times_tested: number
  times_worked: number
  times_failed: number
  usage_count: number
}

export interface HookLeaderboardResponse {
  entries: HookLeaderboardEntry[]
  total_votes: number
}

export interface ABTestVoteRequest {
  result: 'worked' | 'failed'
  notes?: string
}

export interface ABTestVoteResponse {
  id: string
  times_tested: number
  times_worked: number
  times_failed: number
  ab_score: number | null
}

export interface HookHistoryItem {
  id: string
  text: string
  text_hindi?: string
  text_english?: string
  hook_type: string
  category: string
  platform: string
  target_audience?: string
  predicted_score?: number
  predicted_reasoning?: string
  times_tested: number
  times_worked: number
  times_failed: number
  ab_score?: number | null
  usage_count: number
  generation_topic?: string
  created_at?: string
}

export interface HookHistoryResponse {
  items: HookHistoryItem[]
  total: number
  page: number
  page_size: number
}

// Legacy compatibility alias
export type HookSuggestion = HookVariation
export type HookSuggestionsResponse = HookGenerateResponse

export interface ProjectCreateRequest {
  name: string
  description?: string
  category?: string
  tags?: string[]
}

export interface ProjectResponse {
  id: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  status: string
  cover_image_url?: string
  scripts_count: number
  captions_count: number
  thumbnails_count: number
}

export interface ProjectListParams {
  page?: number
  page_size?: number
  status?: string
  search?: string
}

export interface ProjectUpdateRequest {
  name?: string
  description?: string
  category?: string
  tags?: string[]
  status?: string
  cover_image_url?: string
}
