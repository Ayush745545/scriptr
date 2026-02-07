import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { scriptApi, ScriptGenerateRequest } from '../../services/api'
import { Sparkles, ArrowRight } from 'lucide-react'

const categories = [
  { value: 'entertainment', label: 'Entertainment', labelHi: 'मनोरंजन', icon: '🎭' },
  { value: 'education', label: 'Education', labelHi: 'शिक्षा', icon: '📚' },
  { value: 'food', label: 'Food', labelHi: 'खाना', icon: '🍲' },
  { value: 'fitness', label: 'Fitness', labelHi: 'फिटनेस', icon: '💪' },
  { value: 'business', label: 'Business', labelHi: 'व्यापार', icon: '💼' },
  { value: 'technology', label: 'Technology', labelHi: 'तकनीक', icon: '💻' },
  { value: 'lifestyle', label: 'Lifestyle', labelHi: 'जीवनशैली', icon: '✨' },
  { value: 'comedy', label: 'Comedy', labelHi: 'कॉमेडी', icon: '😂' },
  { value: 'motivation', label: 'Motivation', labelHi: 'प्रेरणा', icon: '🔥' },
  { value: 'festival', label: 'Festival', labelHi: 'त्योहार', icon: '🪔' },
]

const scriptTypes = [
  { value: 'reel', label: 'Instagram Reel', duration: '30-60 sec' },
  { value: 'short', label: 'YouTube Short', duration: '60 sec' },
  { value: 'youtube', label: 'YouTube Video', duration: '5-10 min' },
  { value: 'podcast', label: 'Podcast Intro', duration: '2-3 min' },
  { value: 'ad', label: 'Ad Script', duration: '15-30 sec' },
  { value: 'story', label: 'Story/Status', duration: '15 sec' },
]

const tones = [
  { value: 'casual', label: 'Casual', labelHi: 'आम बोलचाल' },
  { value: 'professional', label: 'Professional', labelHi: 'पेशेवर' },
  { value: 'humorous', label: 'Humorous', labelHi: 'मज़ाकिया' },
  { value: 'inspirational', label: 'Inspirational', labelHi: 'प्रेरणादायक' },
  { value: 'educational', label: 'Educational', labelHi: 'शैक्षिक' },
  { value: 'dramatic', label: 'Dramatic', labelHi: 'नाटकीय' },
]

export default function ScriptGeneratorPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ScriptGenerateRequest>({
    topic: '',
    language: 'hinglish',
    script_type: 'reel',
    category: 'entertainment',
    tone: 'casual',
    target_duration_seconds: 45,
    target_audience: '',
    include_hooks: true,
    include_hashtags: true,
    additional_instructions: '',
  })

  const [isGenerating, setIsGenerating] = useState(false);

  // Mock mutation for UI dev if api not ready, or use real one
  const generateMutation = useMutation({
    mutationFn: async (data: ScriptGenerateRequest) => {
      setIsGenerating(true);
      // Simulate delay for UI testing
      // await new Promise(resolve => setTimeout(resolve, 3000)); 
      return scriptApi.generate(data)
    },
    onSuccess: (response) => {
      setIsGenerating(false);
      toast.success('Script generated successfully!')
      navigate(`/scripts/${response.data.id}`)
    },
    onError: () => {
      setIsGenerating(false);
      toast.error('Failed to generate script. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.topic.trim()) {
      toast.error('Please enter a topic')
      return
    }
    generateMutation.mutate(formData)
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-display font-bold text-white mb-3">Generate Script</h1>
        <p className="text-text-secondary text-lg">
          Create viral scripts in Hindi, English, or Hinglish with AI magic.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Topic Input - Large Glass Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-1 rounded-3xl"
        >
          <div className="bg-background/40 backdrop-blur-xl rounded-[20px] p-6 md:p-8">
            <label className="block text-xl font-medium text-white mb-4">
              What's your video about?
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., 5 tips for waking up early and being productive, focusing on Indian lifestyle..."
              className="w-full bg-transparent border-none text-white text-lg placeholder-text-tertiary focus:ring-0 min-h-[120px] resize-none"
              required
            />
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Language Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <label className="block text-sm font-medium text-text-secondary uppercase tracking-wider mb-4 pl-2">
                Language / भाषा
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'hi', label: 'हिंदी', sublabel: 'Hindi' },
                  { value: 'en', label: 'English', sublabel: 'English' },
                  { value: 'hinglish', label: 'Hinglish', sublabel: 'Mix' },
                ].map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, language: lang.value as 'hi' | 'en' | 'hinglish' })}
                    className={`p-4 rounded-2xl border transition-all duration-200 text-center ${formData.language === lang.value
                        ? 'bg-accent text-white border-accent shadow-glow'
                        : 'bg-surface/50 text-text-secondary border-white/5 hover:bg-surface hover:text-white'
                      }`}
                  >
                    <span className="block font-bold text-lg mb-0.5">{lang.label}</span>
                    <span className="block text-xs opacity-70">{lang.sublabel}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Category */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-text-secondary uppercase tracking-wider mb-4 pl-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`flex items-center p-3 rounded-xl border transition-all duration-200 ${formData.category === cat.value
                        ? 'bg-white/10 text-white border-accent/50'
                        : 'bg-surface/30 text-text-secondary border-white/5 hover:bg-surface/50 hover:text-white'
                      }`}
                  >
                    <span className="mr-3 text-xl">{cat.icon}</span>
                    <div className="text-left">
                      <span className="block text-sm font-medium">{cat.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Script Type & Tone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <label className="block text-sm font-medium text-text-secondary uppercase tracking-wider mb-4 pl-2">
                Format & Tone
              </label>
              <div className="glass-card rounded-3xl p-6 space-y-6">
                {/* Type Carousel */}
                <div className="overflow-x-auto pb-2 -mx-2 px-2 flex space-x-3 scrollbar-hide">
                  {scriptTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, script_type: type.value as any })}
                      className={`flex-none px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap ${formData.script_type === type.value
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-text-secondary border-white/20 hover:border-white hover:text-white'
                        }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Tone Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {tones.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, tone: tone.value })}
                      className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${formData.tone === tone.value
                          ? 'bg-accent/20 text-accent ring-1 ring-accent'
                          : 'bg-surface/50 text-text-tertiary hover:text-white hover:bg-surface'
                        }`}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10" />

                {/* Additional Options */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Viral Hooks</span>
                  <div
                    onClick={() => setFormData({ ...formData, include_hooks: !formData.include_hooks })}
                    className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ${formData.include_hooks ? 'bg-success' : 'bg-surface border border-white/10'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${formData.include_hooks ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Generate Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-4"
            >
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full relative group overflow-hidden rounded-full p-[1px]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-orange-500 animate-gradient opacity-100 transition-opacity" />
                <div className="relative bg-background rounded-full px-8 py-4 bg-opacity-90 group-hover:bg-opacity-80 transition-all">
                  <div className="flex items-center justify-center space-x-2">
                    {isGenerating ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="text-white w-5 h-5" />
                        <span className="text-lg font-bold text-white tracking-wide">Generate Magic</span>
                        <ArrowRight className="text-white/50 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </div>
              </button>
              <p className="text-center text-xs text-text-tertiary mt-4">
                Takes about 15-30 seconds to generate a full script
              </p>
            </motion.div>
          </div>
        </div>
      </form>
    </div>
  )
}
