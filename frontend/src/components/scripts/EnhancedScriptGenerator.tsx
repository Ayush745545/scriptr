import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { enhancedScriptApi, EnhancedScriptRequest, EnhancedScriptResponse } from '../../services/api'

// ============================================
// TYPES
// ============================================

type Language = 'hi' | 'en' | 'hinglish'
type ContentType = 'reel' | 'short' | 'ad' | 'educational'
type Tone = 'funny' | 'professional' | 'trendy'
type Duration = 15 | 30 | 60

interface GeneratedScript {
  title: string
  hook: string
  main_script: string
  cta: string
  full_script: string
  hooks: string[]
  hashtags: string[]
  audio_suggestions: string[]
  timing_breakdown: Record<string, string>
}

// ============================================
// CONSTANTS
// ============================================

const LANGUAGES: { value: Language; label: string; labelNative: string; example: string }[] = [
  {
    value: 'hi',
    label: 'Hindi',
    labelNative: 'हिंदी',
    example: 'नमस्ते दोस्तों! आज हम बात करेंगे...',
  },
  {
    value: 'en',
    label: 'English',
    labelNative: 'English',
    example: "Hey everyone! Today we're talking about...",
  },
  {
    value: 'hinglish',
    label: 'Hinglish',
    labelNative: 'हिंग्लिश',
    example: 'Aaj main aapko bataunga ek amazing trick...',
  },
]

const CONTENT_TYPES: { value: ContentType; label: string; icon: string; description: string }[] = [
  { value: 'reel', label: 'Instagram Reel', icon: '📱', description: 'Vertical video, 15-90 sec' },
  { value: 'short', label: 'YouTube Short', icon: '▶️', description: 'Vertical video, up to 60 sec' },
  { value: 'ad', label: 'Product Promo', icon: '🛍️', description: 'Promotional content' },
  { value: 'educational', label: 'Educational', icon: '📚', description: 'Teach something valuable' },
]

const TONES: { value: Tone; label: string; labelHi: string; emoji: string }[] = [
  { value: 'funny', label: 'Funny', labelHi: 'मज़ाकिया', emoji: '😂' },
  { value: 'professional', label: 'Professional', labelHi: 'पेशेवर', emoji: '💼' },
  { value: 'trendy', label: 'Trendy', labelHi: 'ट्रेंडी', emoji: '🔥' },
]

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 15, label: '15 sec' },
  { value: 30, label: '30 sec' },
  { value: 60, label: '60 sec' },
]

const EXAMPLE_TOPICS = [
  { topic: 'Cafe promotion for a new coffee shop in Mumbai', category: 'business' },
  { topic: 'Fitness tips for busy office workers', category: 'fitness' },
  { topic: 'Diwali sale announcement for clothing brand', category: 'festival' },
  { topic: 'How to make perfect butter chicken at home', category: 'food' },
  { topic: 'Morning routine for students preparing for exams', category: 'education' },
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnhancedScriptGenerator() {
  // Form state
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState<Language>('hinglish')
  const [contentType, setContentType] = useState<ContentType>('reel')
  const [tone, setTone] = useState<Tone>('trendy')
  const [duration, setDuration] = useState<Duration>(30)
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  // UI state
  const [showPreview, setShowPreview] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null)
  const [activeTab, setActiveTab] = useState<'full' | 'sections' | 'extras'>('full')

  // API mutation
  const generateMutation = useMutation({
    mutationFn: (data: EnhancedScriptRequest) => enhancedScriptApi.generate(data),
    onSuccess: (response) => {
      toast.success('Script generated successfully! 🎉')
      // Extract structured data from response
      const script = response.data as EnhancedScriptResponse
      setGeneratedScript({
        title: script.title,
        hook: script.hook || '',
        main_script: script.main_script || script.full_script,
        cta: script.cta || '',
        full_script: script.full_script,
        hooks: script.alternative_hooks || [],
        hashtags: script.hashtags || [],
        audio_suggestions: script.audio_suggestions || [],
        timing_breakdown: script.timing_breakdown || {},
      })
      setShowPreview(true)
    },
    onError: () => {
      toast.error('Failed to generate script. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!topic.trim()) {
      toast.error('Please enter a topic')
      return
    }

    const request: EnhancedScriptRequest = {
      topic,
      language,
      content_type: contentType,
      tone,
      duration_seconds: duration,
      include_cultural_refs: true,
      additional_instructions: additionalInstructions || undefined,
    }

    generateMutation.mutate(request)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  const handleExampleTopic = (example: typeof EXAMPLE_TOPICS[0]) => {
    setTopic(example.topic)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Script Generator
          </h1>
          <p className="text-lg text-gray-600">
            Create viral scripts in Hindi, English, or Hinglish
          </p>
          <p className="text-sm text-primary-600 hindi-text mt-1">
            वायरल स्क्रिप्ट बनाएं मिनटों में
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Language Toggle */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Choose Language
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setLanguage(lang.value)}
                      className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${language === lang.value
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                    >
                      {language === lang.value && (
                        <motion.div
                          layoutId="language-indicator"
                          className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center"
                        >
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </motion.div>
                      )}
                      <div className="text-xl font-bold text-gray-900 hindi-text">
                        {lang.labelNative}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">{lang.label}</div>
                    </button>
                  ))}
                </div>
                {/* Language Example */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Example output:</p>
                  <p className={`text-sm text-gray-700 mt-1 ${language === 'hi' ? 'hindi-text' : ''}`}>
                    "{LANGUAGES.find(l => l.value === language)?.example}"
                  </p>
                </div>
              </div>

              {/* Topic Input */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <label className="block text-lg font-semibold text-gray-900 mb-2">
                  What's your video about? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., New cafe promotion in Koramangala with Instagram-worthy ambience"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                  required
                />
                {/* Example Topics */}
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-2">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_TOPICS.slice(0, 3).map((example, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleExampleTopic(example)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                      >
                        {example.topic.slice(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Type */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <label className="block text-lg font-semibold text-gray-900 mb-4">
                  Content Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setContentType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${contentType === type.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <span className="text-2xl">{type.icon}</span>
                      <div className="font-medium text-gray-900 mt-2">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone & Duration Row */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Tone */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Tone
                  </label>
                  <div className="space-y-2">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTone(t.value)}
                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${tone === t.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{t.emoji}</span>
                          <span className="font-medium text-gray-900">{t.label}</span>
                        </div>
                        <span className="text-sm text-gray-500 hindi-text">{t.labelHi}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Duration
                  </label>
                  <div className="space-y-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDuration(d.value)}
                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-center transition-all ${duration === d.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <span className={`font-bold text-xl ${duration === d.value ? 'text-primary-600' : 'text-gray-700'}`}>
                          {d.label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    ~{Math.round(duration * 2.5)} words for natural speaking pace
                  </p>
                </div>
              </div>

              {/* Additional Instructions */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <label className="block text-lg font-semibold text-gray-900 mb-2">
                  Additional Instructions (Optional)
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Any specific requirements like brand mentions, target audience details, or style preferences..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={2}
                />
              </div>

              {/* Generate Button */}
              <motion.button
                type="submit"
                disabled={generateMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generateMutation.isPending ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating your viral script...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>✨</span>
                    Generate Script
                    <span>✨</span>
                  </span>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Preview Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:sticky lg:top-8 lg:self-start"
          >
            <AnimatePresence mode="wait">
              {showPreview && generatedScript ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
                >
                  {/* Preview Header */}
                  <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-4">
                    <h2 className="text-xl font-bold text-white">{generatedScript.title}</h2>
                    <p className="text-primary-100 text-sm mt-1">
                      {language === 'hi' ? 'हिंदी' : language === 'hinglish' ? 'Hinglish' : 'English'} • {duration}s • {tone}
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    {(['full', 'sections', 'extras'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab
                          ? 'text-primary-600 border-b-2 border-primary-500'
                          : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        {tab === 'full' ? 'Full Script' : tab === 'sections' ? 'By Section' : 'Extras'}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="p-5 max-h-[600px] overflow-y-auto">
                    {activeTab === 'full' && (
                      <div className="space-y-4">
                        <div className="relative">
                          <pre className={`whitespace-pre-wrap text-gray-700 leading-relaxed ${language === 'hi' ? 'hindi-text' : ''}`}>
                            {generatedScript.full_script}
                          </pre>
                          <button
                            onClick={() => copyToClipboard(generatedScript.full_script, 'Full script')}
                            className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'sections' && (
                      <div className="space-y-5">
                        {/* Hook */}
                        <Section
                          title="🎣 Hook (First 3 seconds)"
                          content={generatedScript.hook}
                          onCopy={() => copyToClipboard(generatedScript.hook, 'Hook')}
                          highlight="bg-yellow-50 border-yellow-200"
                          language={language}
                        />

                        {/* Main Script */}
                        <Section
                          title="📝 Main Script"
                          content={generatedScript.main_script}
                          onCopy={() => copyToClipboard(generatedScript.main_script, 'Main script')}
                          language={language}
                        />

                        {/* CTA */}
                        <Section
                          title="📢 Call-to-Action"
                          content={generatedScript.cta}
                          onCopy={() => copyToClipboard(generatedScript.cta, 'CTA')}
                          highlight="bg-green-50 border-green-200"
                          language={language}
                        />
                      </div>
                    )}

                    {activeTab === 'extras' && (
                      <div className="space-y-5">
                        {/* Alternative Hooks */}
                        {generatedScript.hooks.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">🎯 Alternative Hooks</h4>
                            <div className="space-y-2">
                              {generatedScript.hooks.map((hook, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-gray-50 rounded-lg flex justify-between items-start gap-2"
                                >
                                  <span className={`text-sm text-gray-700 ${language === 'hi' ? 'hindi-text' : ''}`}>
                                    {idx + 1}. {hook}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(hook, 'Hook')}
                                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Hashtags */}
                        {generatedScript.hashtags.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900"># Hashtags</h4>
                              <button
                                onClick={() => copyToClipboard(generatedScript.hashtags.join(' '), 'Hashtags')}
                                className="text-sm text-primary-600 hover:text-primary-700"
                              >
                                Copy all
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {generatedScript.hashtags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full"
                                >
                                  {tag.startsWith('#') ? tag : `#${tag}`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Audio Suggestions */}
                        {generatedScript.audio_suggestions.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">🎵 Suggested Audio</h4>
                            <div className="space-y-2">
                              {generatedScript.audio_suggestions.map((audio, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-purple-50 rounded-lg flex items-center gap-3"
                                >
                                  <span className="text-xl">🎧</span>
                                  <span className="text-sm text-gray-700">{audio}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timing Breakdown */}
                        {Object.keys(generatedScript.timing_breakdown).length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">⏱️ Timing Guide</h4>
                            <div className="space-y-2">
                              {Object.entries(generatedScript.timing_breakdown).map(([time, content], idx) => (
                                <div key={idx} className="flex gap-3 text-sm">
                                  <span className="font-mono text-primary-600 min-w-[60px]">{time}</span>
                                  <span className="text-gray-600">{content}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-200 p-4 flex gap-3">
                    <button
                      onClick={() => {
                        setShowPreview(false)
                        setGeneratedScript(null)
                      }}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Generate Another
                    </button>
                    <button
                      onClick={() => copyToClipboard(generatedScript.full_script, 'Script')}
                      className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      Copy Script
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center"
                >
                  <div className="text-6xl mb-4">✍️</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Your script will appear here
                  </h3>
                  <p className="text-gray-500">
                    Fill out the form and click generate to create your viral script
                  </p>

                  {/* Sample Preview Cards */}
                  <div className="mt-8 grid gap-3 text-left">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-primary-600 font-medium">
                        <span>🎣</span> Hook Example
                      </div>
                      <p className="text-gray-700 mt-1 text-sm">
                        "Ye galti mat karna warna pura investment doob jayega!"
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                        <span>📢</span> CTA Example
                      </div>
                      <p className="text-gray-700 mt-1 text-sm">
                        "Follow for more tips aur comment mein batao aapka favorite!"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SectionProps {
  title: string
  content: string
  onCopy: () => void
  highlight?: string
  language: Language
}

function Section({ title, content, onCopy, highlight = '', language }: SectionProps) {
  return (
    <div className={`p-4 rounded-lg border ${highlight || 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <button
          onClick={onCopy}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      <p className={`text-gray-700 whitespace-pre-wrap ${language === 'hi' ? 'hindi-text' : ''}`}>
        {content}
      </p>
    </div>
  )
}
