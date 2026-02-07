import VideoCaptionUploader from '../../components/captions/VideoCaptionUploader'
import { CaptionResponse } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import { CloudUpload, Wand2, Languages } from 'lucide-react'

export default function CaptionsPage() {
  const navigate = useNavigate()

  const handleUploadComplete = (caption: CaptionResponse) => {
    navigate(`/captions/${caption.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
      <div className="text-center mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 blur-[100px] rounded-full -z-10" />

        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
          Captions that <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-pink-500">Pop</span>
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Auto-generate subtitles in Hinglish, Hindi, and English with Bollywood-style animations.
        </p>
      </div>

      <div className="glass-card rounded-[40px] p-2 mb-20 bg-surface/30 backdrop-blur-2xl border border-white/10 shadow-2xl">
        <div className="bg-background/50 rounded-[32px] overflow-hidden">
          <VideoCaptionUploader
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<CloudUpload className="text-accent" size={32} />}
          title="Instant Transcription"
          desc="Uses OpenAI Whisper for 99% accuracy even with heavy Indian accents."
        />
        <FeatureCard
          icon={<Wand2 className="text-purple-400" size={32} />}
          title="Viral Aesthetics"
          desc="Choose from 5+ presets like 'Bollywood Drama' or 'Minimal Chic'."
        />
        <FeatureCard
          icon={<Languages className="text-green-400" size={32} />}
          title="Language Mix"
          desc="Perfectly handles 'Bhai, ye scene check kar' (Hinglish context)."
        />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass p-8 rounded-3xl hover:bg-white/10 transition-colors duration-300">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-text-secondary">{desc}</p>
    </div>
  )
}
