import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const features = [
  {
    icon: '📝',
    title: 'Script Generator',
    titleHi: 'स्क्रिप्ट जेनरेटर',
    description: 'AI-powered scripts in Hindi, English, or Hinglish for reels, shorts, and more',
  },
  {
    icon: '🎬',
    title: 'Auto Captions',
    titleHi: 'ऑटो कैप्शन',
    description: 'Accurate transcription with support for Indian languages and accents',
  },
  {
    icon: '🎨',
    title: 'Reel Templates',
    titleHi: 'रील टेम्पलेट',
    description: '10+ templates for festivals, food, fitness, business, and lifestyle content',
  },
  {
    icon: '🖼️',
    title: 'Thumbnail Creator',
    titleHi: 'थंबनेल क्रिएटर',
    description: 'Eye-catching thumbnails with Hindi text and AI backgrounds',
  },
  {
    icon: '⚡',
    title: 'Viral Hooks',
    titleHi: 'वायरल हुक्स',
    description: 'Attention-grabbing hooks that work for Indian audiences',
  },
  {
    icon: '📁',
    title: 'Project Management',
    titleHi: 'प्रोजेक्ट मैनेजमेंट',
    description: 'Organize all your content in one place',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-[120px] opacity-30" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] opacity-30" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <nav className="flex items-center justify-between mb-16">
            <span className="text-2xl font-bold font-display text-white">Bolo</span>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-text-secondary hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition-all"
              >
                Get Started Free
              </Link>
            </div>
          </nav>

          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight"
            >
              Create Viral Content
              <span className="block text-gradient-accent mt-2">For Indian Audiences</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-xl text-text-secondary mb-4"
            >
              AI-powered tools to create scripts, captions, thumbnails, and more in Hindi, English, or Hinglish
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-lg text-white/80 font-hindi mb-8"
            >
              हिंदी, अंग्रेज़ी, या हिंग्लिश में कंटेंट बनाएं
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/register"
                className="px-8 py-3.5 rounded-full bg-accent text-white font-bold hover:bg-accent/90 transition-all shadow-[0_0_20px_rgba(255,149,0,0.4)]"
              >
                Start Creating Free →
              </Link>
              <a
                href="#features"
                className="text-text-secondary hover:text-white transition-colors flex items-center"
              >
                See Features
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-24 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Everything You Need to Create Content
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Built specifically for Indian content creators with support for local languages and cultural themes
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="glass-card rounded-2xl p-6 hover:bg-white/5 transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-accent mb-3 font-hindi">
                  {feature.titleHi}
                </p>
                <p className="text-text-secondary">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Languages Section */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Create Content in Your Language
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center p-8 rounded-2xl bg-surface border border-white/10 hover:border-accent/40 transition-colors"
            >
              <h3 className="text-6xl font-bold text-white font-hindi mb-4">हिंदी</h3>
              <p className="text-lg font-medium text-white">Hindi</p>
              <p className="text-text-secondary mt-2">Pure Hindi scripts and captions with proper Unicode support</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center p-8 rounded-2xl bg-surface border border-white/10 hover:border-blue-500/40 transition-colors"
            >
              <h3 className="text-6xl font-bold text-white mb-4">ABC</h3>
              <p className="text-lg font-medium text-white">English</p>
              <p className="text-text-secondary mt-2">Professional English content for global audiences</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center p-8 rounded-2xl bg-surface border border-white/10 hover:border-pink-500/40 transition-colors"
            >
              <h3 className="text-4xl font-bold text-accent mb-4">
                <span className="font-hindi">हिंग्</span>lish
              </h3>
              <p className="text-lg font-medium text-white">Hinglish</p>
              <p className="text-text-secondary mt-2">Mix of Hindi and English that resonates with young Indians</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-accent/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Create Viral Content?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Join thousands of Indian creators already using Bolo
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
          >
            Get Started Free
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-text-tertiary py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <span className="text-xl font-bold text-white">Bolo</span>
              <p className="text-sm mt-1">AI-powered content creation for India</p>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              <Link to="/register" className="hover:text-white transition-colors">Sign Up</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center text-sm">
            <p>© {new Date().getFullYear()} Bolo. Made with ❤️ for Indian Creators</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
