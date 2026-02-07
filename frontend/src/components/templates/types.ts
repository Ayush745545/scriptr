export type TemplateCategory =
  | 'festival'
  | 'food'
  | 'fitness'
  | 'business'
  | 'education'
  | string

export interface TemplateThemeV1 {
  name?: string
  colors?: Record<string, string>
  fonts?: Record<string, string>
}

export type PlaceholderType = 'video' | 'text' | 'logo' | 'audio_marker' | 'image'

export interface TemplatePlaceholderV1 {
  type: PlaceholderType
  label?: string
  required?: boolean
  default?: string
  maxLength?: number
  markerTime?: number
}

export type LayerType = 'solid' | 'video' | 'image' | 'text'

export interface TemplateLayerV1 {
  id: string
  type: LayerType
  start: number
  end: number | '$duration'
  z?: number
  source?: string
  text?: string
  style?: Record<string, any>
  transform?: Record<string, any>
  animations?: Array<Record<string, any>>
  effects?: Array<Record<string, any>>
}

export interface TemplateDefinitionV1 {
  schemaVersion: string
  id: string
  name: { en: string; hi?: string }
  category: TemplateCategory
  tags?: string[]
  aspectRatio: string
  width: number
  height: number
  fps: number
  durationPresets: number[]
  themes: Record<string, TemplateThemeV1>
  placeholders: Record<string, TemplatePlaceholderV1>
  layers: TemplateLayerV1[]
}

export interface TemplatePreviewProps {
  definition: TemplateDefinitionV1
  themeId: string
  durationSeconds: number
  placeholderValues: Record<string, string>
  localMediaUrls?: Record<string, string>
}
