import { useRef, useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  thumbnailApi,
  ThumbnailGenerateRequest,
  ThumbnailFormula,
  EditorRenderRequest,
} from '../../services/api'
import ThumbnailCanvas, {
  ThumbnailCanvasHandle,
} from '../../components/thumbnails/ThumbnailCanvas'
import StickerEmojiPanel from '../../components/thumbnails/StickerEmojiPanel'
import FontPicker from '../../components/thumbnails/FontPicker'
import FormulaCards from '../../components/thumbnails/FormulaCards'

// ── Size presets ────────────────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { key: 'youtube', label: 'YouTube (1280×720)', w: 1280, h: 720 },
  { key: 'instagram', label: 'Instagram (1080×1080)', w: 1080, h: 1080 },
  { key: 'story', label: 'Story / Reel (1080×1920)', w: 1080, h: 1920 },
]

const STYLE_OPTIONS = [
  { value: 'youtube_standard', label: 'YouTube Standard' },
  { value: 'clickbait', label: 'Clickbait' },
  { value: 'youtube_minimal', label: 'Minimal' },
  { value: 'professional', label: 'Professional' },
  { value: 'educational', label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'instagram_reel', label: 'Instagram Reel' },
]

type Tab = 'formula' | 'editor' | 'quick'

export default function ThumbnailGeneratorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef<ThumbnailCanvasHandle>(null)

  // ── State ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('formula')
  const [canvasSize, setCanvasSize] = useState({ w: 1280, h: 720, key: 'youtube' })
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [selectedFormula, setSelectedFormula] = useState<string | null>(null)
  const [enhance, setEnhance] = useState(false)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [sidebarTab, setSidebarTab] = useState<'text' | 'stickers' | 'font'>('text')

  // Quick-generate form
  const [formData, setFormData] = useState<ThumbnailGenerateRequest>({
    title: '',
    primary_text: '',
    secondary_text: '',
    style: searchParams.get('style') || 'youtube_standard',
    font_family: 'poppins-extrabold',
    primary_color: '#FFFFFF',
    secondary_color: '#FFD700',
    background_color: '#1a1a2e',
    width: 1280,
    height: 720,
    generate_variants: 3,
    output_sizes: ['youtube', 'instagram'],
    enhance: false,
  })

  // ── Mutations ──────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: (data: ThumbnailGenerateRequest) => thumbnailApi.generate(data),
    onSuccess: () => {
      toast.success('🎉 3 thumbnail variations submitted! Check back in ~30s.')
      navigate('/thumbnails')
    },
    onError: () => {
      toast.error('Failed to generate. Is the backend running?')
    },
  })

  const editorRenderMutation = useMutation({
    mutationFn: (data: EditorRenderRequest) => thumbnailApi.editorRender(data),
    onSuccess: (res) => {
      const outputs = res.data.outputs
      toast.success(`✅ Rendered ${outputs.length} size(s)!`)
      // Open first URL
      if (outputs[0]?.url) {
        window.open(outputs[0].url, '_blank')
      }
    },
    onError: () => {
      toast.error('Render failed. Check backend logs.')
    },
  })

  // ── Canvas handlers ────────────────────────────────────────────────

  const handleAddText = useCallback(() => {
    canvasRef.current?.addText('Your Text Here', {
      fontSize: 72,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 3,
    })
  }, [])

  const handleAddEmoji = useCallback((emoji: string) => {
    canvasRef.current?.addEmoji(emoji, 0.75, 0.1, 80)
  }, [])

  const handleUploadImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    await canvasRef.current?.addImage(url)
  }, [])

  const handleUploadBackground = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    await canvasRef.current?.setBackgroundImage(url)
  }, [])

  const handleAiBackground = useCallback(() => {
    const prompt = window.prompt('Describe your background (e.g., "neon city lights, dark gradient")')
    if (!prompt) return
    // For AI bg, we use the quick-generate flow with the prompt
    setFormData((prev) => ({ ...prev, ai_background_prompt: prompt }))
    setTab('quick')
    toast.success('AI prompt set! Switch to Quick Generate to create.')
  }, [])

  const handleFormulaSelect = useCallback((formula: ThumbnailFormula) => {
    setSelectedFormula(formula.id)
    setFormData((prev) => ({
      ...prev,
      formula_id: formula.id,
      primary_text: formula.example_text,
      secondary_text: formula.example_text_en,
    }))
    // Pre-populate canvas
    if (canvasRef.current) {
      const layout = formula.layout as any
      if (layout.gradient_colors) {
        setBgColor(layout.gradient_colors[0])
      }
      canvasRef.current.addText(formula.example_text, {
        fontSize: 72,
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 3,
      })
    }
    toast.success(`Applied "${formula.name}" formula`)
  }, [])

  const handleEditorRender = useCallback(() => {
    const state = canvasRef.current?.getCanvasState()
    if (!state || state.layers.length === 0) {
      toast.error('Canvas is empty — add some layers first')
      return
    }
    editorRenderMutation.mutate({
      canvas_json: state,
      output_sizes: ['youtube', 'instagram'],
      enhance,
    })
  }, [enhance, editorRenderMutation])

  const handleQuickGenerate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!formData.title.trim()) {
        toast.error('Please enter a title/topic')
        return
      }
      generateMutation.mutate({
        ...formData,
        primary_text: formData.primary_text?.trim() || undefined,
        secondary_text: formData.secondary_text?.trim() || undefined,
        enhance,
      })
    },
    [formData, enhance, generateMutation]
  )

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Thumbnail Generator
          </h1>
          <p className="text-gray-600 mt-1">
            Create eye-catching thumbnails for YouTube & Instagram with Hindi text support
          </p>
        </div>
        <Link to="/thumbnails" className="btn-secondary whitespace-nowrap">
          ← Back
        </Link>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {[
          { key: 'formula' as Tab, label: '🎨 Formula Picker', desc: '5 proven Indian formulas' },
          { key: 'editor' as Tab, label: '🖌️ Canvas Editor', desc: 'Drag & drop layers' },
          { key: 'quick' as Tab, label: '⚡ Quick Generate', desc: 'AI-powered one-click' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white border border-b-white border-gray-200 text-primary-600 -mb-[1px]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="hidden sm:inline text-xs text-gray-400 ml-1.5">
              — {t.desc}
            </span>
          </button>
        ))}
      </div>

      {/* ── Formula Picker Tab ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === 'formula' && (
          <motion.div
            key="formula"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                5 Thumbnail Formulas That Work for Indian Niches
              </h3>
              <p className="text-sm text-gray-600">
                Click a formula to auto-fill text & layout. Then switch to Canvas Editor or Quick Generate.
              </p>
            </div>

            <FormulaCards selected={selectedFormula} onSelect={handleFormulaSelect} />

            {selectedFormula && (
              <div className="flex gap-3">
                <button
                  onClick={() => setTab('editor')}
                  className="btn-primary"
                >
                  Open in Canvas Editor →
                </button>
                <button
                  onClick={() => setTab('quick')}
                  className="btn-secondary"
                >
                  Quick Generate (3 AI variations)
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Canvas Editor Tab ─────────────────────────────────────── */}
        {tab === 'editor' && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Canvas area */}
              <div className="flex-1 min-w-0">
                {/* Size selector */}
                <div className="flex gap-2 mb-3">
                  {SIZE_OPTIONS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setCanvasSize({ w: s.w, h: s.h, key: s.key })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        canvasSize.key === s.key
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-gray-300 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Canvas */}
                <div className="bg-gray-100 rounded-xl p-4 border border-gray-200">
                  <ThumbnailCanvas
                    ref={canvasRef}
                    width={canvasSize.w}
                    height={canvasSize.h}
                    backgroundColor={bgColor}
                    onSelectionChange={setSelectedObj}
                  />
                </div>

                {/* Canvas toolbar */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={handleAddText} className="btn-secondary text-sm">
                    + Text
                  </button>
                  <label className="btn-secondary text-sm cursor-pointer">
                    + Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadImage}
                    />
                  </label>
                  <label className="btn-secondary text-sm cursor-pointer">
                    🖼️ Background
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadBackground}
                    />
                  </label>
                  <button onClick={handleAiBackground} className="btn-secondary text-sm">
                    🤖 AI Background
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => canvasRef.current?.deleteSelected()}
                    className="btn-secondary text-sm text-red-600 hover:text-red-700"
                    disabled={!selectedObj}
                  >
                    🗑 Delete
                  </button>
                  <button
                    onClick={() => canvasRef.current?.bringForward()}
                    className="btn-secondary text-sm"
                    disabled={!selectedObj}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => canvasRef.current?.sendBackward()}
                    className="btn-secondary text-sm"
                    disabled={!selectedObj}
                  >
                    ↓
                  </button>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-72 space-y-4">
                {/* Sidebar tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {[
                    { key: 'text' as const, label: 'Text' },
                    { key: 'stickers' as const, label: 'Stickers' },
                    { key: 'font' as const, label: 'Font' },
                  ].map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setSidebarTab(st.key)}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                        sidebarTab === st.key
                          ? 'bg-white shadow-sm font-medium text-gray-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {sidebarTab === 'text' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Background Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => {
                            setBgColor(e.target.value)
                            canvasRef.current?.setBackgroundColor(e.target.value)
                          }}
                          className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => {
                            setBgColor(e.target.value)
                            canvasRef.current?.setBackgroundColor(e.target.value)
                          }}
                          className="input-field text-xs flex-1"
                        />
                      </div>
                    </div>

                    {/* Quick text colors */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Quick Colors
                      </label>
                      <div className="flex gap-1.5 flex-wrap">
                        {['#FFFFFF', '#FFD700', '#FF0000', '#00FF00', '#00BFFF', '#FF6B35', '#FF1493', '#000000'].map(
                          (c) => (
                            <button
                              key={c}
                              onClick={() =>
                                canvasRef.current?.updateSelectedText({ fill: c })
                              }
                              className="w-7 h-7 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          )
                        )}
                      </div>
                    </div>

                    {/* Enhance toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-500">
                        ✨ One-Click Enhance
                      </label>
                      <button
                        onClick={() => setEnhance(!enhance)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          enhance ? 'bg-primary-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            enhance ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {sidebarTab === 'stickers' && (
                  <StickerEmojiPanel onEmojiClick={handleAddEmoji} />
                )}

                {sidebarTab === 'font' && (
                  <FontPicker
                    value={formData.font_family || 'poppins-extrabold'}
                    onChange={(fontId, family) => {
                      setFormData((prev) => ({ ...prev, font_family: fontId }))
                      canvasRef.current?.updateSelectedText({
                        fontFamily: `${family}, Noto Sans Devanagari, sans-serif`,
                      })
                    }}
                  />
                )}

                {/* Render buttons */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <button
                    onClick={handleEditorRender}
                    disabled={editorRenderMutation.isPending}
                    className="btn-primary w-full"
                  >
                    {editorRenderMutation.isPending
                      ? 'Rendering…'
                      : '🚀 Render (YouTube + Instagram)'}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">
                    Server-side render at both 1280×720 + 1080×1080
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Quick Generate Tab ────────────────────────────────────── */}
        {tab === 'quick' && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <form onSubmit={handleQuickGenerate} className="space-y-6 max-w-3xl">
              <motion.div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Title / Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., 5 Tips for Better Thumbnails"
                    className="input-field"
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Text (Hindi/English)
                    </label>
                    <input
                      value={formData.primary_text || ''}
                      onChange={(e) => setFormData({ ...formData, primary_text: e.target.value })}
                      placeholder="e.g., ₹999 में iPhone?!"
                      className="input-field hindi-text"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Text
                    </label>
                    <input
                      value={formData.secondary_text || ''}
                      onChange={(e) => setFormData({ ...formData, secondary_text: e.target.value })}
                      placeholder="e.g., Flipkart Sale LIVE"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Style + Font row */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                    <select
                      value={formData.style || 'youtube_standard'}
                      onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                      className="input-field"
                    >
                      {STYLE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FontPicker
                      value={formData.font_family || 'poppins-extrabold'}
                      onChange={(fontId) => setFormData({ ...formData, font_family: fontId })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variants</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formData.generate_variants ?? 3}
                      onChange={(e) =>
                        setFormData({ ...formData, generate_variants: Number(e.target.value || 3) })
                      }
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={formData.primary_color || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-full h-9 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      value={formData.secondary_color || '#FFD700'}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-full h-9 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={formData.background_color || '#1a1a2e'}
                      onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                      className="w-full h-9 rounded border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>

                {/* AI Background */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🤖 AI Background Prompt (DALL-E 3)
                  </label>
                  <input
                    value={formData.ai_background_prompt || ''}
                    onChange={(e) => setFormData({ ...formData, ai_background_prompt: e.target.value })}
                    placeholder="e.g., neon cyber city, dark gradient with orange accents"
                    className="input-field"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Leave blank to use solid/gradient background color
                  </p>
                </div>

                {/* Output sizes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Output Sizes
                  </label>
                  <div className="flex gap-3">
                    {SIZE_OPTIONS.map((s) => {
                      const checked = (formData.output_sizes || []).includes(s.key)
                      return (
                        <label key={s.key} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const current = formData.output_sizes || []
                              const next = checked
                                ? current.filter((k) => k !== s.key)
                                : [...current, s.key]
                              setFormData({ ...formData, output_sizes: next })
                            }}
                            className="rounded border-gray-300"
                          />
                          {s.label}
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Enhance + Formula */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={enhance}
                      onChange={() => setEnhance(!enhance)}
                      className="rounded border-gray-300"
                    />
                    ✨ One-click enhance (auto-contrast + face brightening)
                  </label>
                  {selectedFormula && (
                    <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                      Formula: {selectedFormula}
                    </span>
                  )}
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending
                      ? 'Generating 3 variations…'
                      : '🚀 Generate 3 Thumbnail Variations'}
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Generates {formData.generate_variants || 3} variations at{' '}
                  {(formData.output_sizes || ['youtube', 'instagram']).join(' + ')} sizes.
                  {formData.ai_background_prompt && ' Using DALL-E 3 for background.'}
                </p>
              </motion.div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
