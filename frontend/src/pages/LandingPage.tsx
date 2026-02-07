import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useState } from 'react'
import { ArrowRight, Play, Check, ChevronDown, Rocket, Clock, Zap, MessageSquare } from 'lucide-react'


export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-apple-bg text-apple-text-primary font-sans selection:bg-apple-accent/30">

      {/* ─── Navbar ───────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-[60px] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 bg-apple-accent/20 blur-lg rounded-full" />
              <Rocket size={20} className="text-apple-accent relative z-10" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Bolo
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Pricing</a>
            <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Login</Link>
            <Link
              to="/register"
              className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all hover:scale-105"
            >
              Get Started
            </Link>
          </div>

          <div className="md:hidden">
            <Link to="/register" className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold">
              Start
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─────────────────────────────────────────────────────────── */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Ambient Backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-apple-accent/20 rounded-[100%] blur-[120px] opacity-30 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-[100%] blur-[100px] opacity-30 pointer-events-none" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ opacity: heroOpacity }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-apple-success animate-pulse" />
              <span className="text-xs font-medium text-white/80 tracking-wide uppercase">Made in India for Creators</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-white mb-6 leading-[1.1]">
              Create Viral Reels <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-apple-accent to-red-500 bg-clip-text text-transparent">
                in seconds.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/60 mb-10 max-w-2xl mx-auto font-normal leading-relaxed">
              Script, hooks, captions, and editing — automated. <br />
              Focus on content, leave the rest to AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
              <Link
                to="/register"
                className="group relative w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Start Creating Free</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 text-white font-medium text-lg border border-white/10 hover:bg-white/20 transition-all backdrop-blur-md flex items-center justify-center gap-2"
              >
                <Play size={18} fill="currentColor" />
                <span>Watch Demo</span>
              </button>
            </div>
          </motion.div>

          {/* Video Demo Container */}
          <div
            id="demo"
            className="relative mx-auto max-w-6xl aspect-video rounded-3xl bg-[#1C1C1E] border border-white/10 shadow-2xl overflow-hidden group"
          >
            <video
              src="/vedio/demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* ─── Problem Section ──────────────────────────────────────────────────────── */}
      <section className="py-32 bg-black relative">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-5xl font-semibold mb-6 tracking-tight">Creator Burnout is Real.</h2>
            <p className="text-xl text-white/50">Stop wasting hours on technical tasks. Create more, edit less.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { icon: Clock, title: "Editing takes hours", desc: "Finding clips, adding captions, and syncing music shouldn't take 4 hours for a 30s reel." },
              { icon: Zap, title: "Trends move fast", desc: "By the time you edit manually, the trend is gone. Speed is the key to going viral." },
              { icon: MessageSquare, title: "Writer's Block", desc: "Staring at a blank screen? Get unlimited viral scripts and hooks instantly." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-apple-surface p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-colors group"
              >
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                  <item.icon size={28} className="text-apple-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{item.title}</h3>
                <p className="text-white/50 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Solution Workflow ────────────────────────────────────────────────────── */}
      <section id="features" className="py-32 bg-apple-bg overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <span className="text-apple-accent font-medium tracking-widest text-xs uppercase mb-4 block">Workflow</span>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">From Idea to Viral <br /><span className="text-white/40">in 4 Simple Steps</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {[
              { title: 'Script Idea', desc: 'Enter a topic, get a viral script in Hinglish.', icon: '✍️' },
              { title: 'Add Captions', desc: 'Auto-generated flashy captions like top creators.', icon: '💬' },
              { title: 'Pick Template', desc: 'Choose from 20+ viral visual styles.', icon: '🎨' },
              { title: 'Export', desc: 'Download HD video ready to post everywhere.', icon: '📤' },
            ].map((step, idx) => (
              <div
                key={idx}
                className="bg-black p-8 rounded-[32px] border border-white/10 relative overflow-hidden group hover:border-apple-accent/30 transition-colors"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 font-bold text-8xl leading-none select-none group-hover:opacity-20 transition-opacity">
                  {idx + 1}
                </div>
                <div className="relative z-10 h-full flex flex-col justify-end min-h-[240px]">
                  <div className="text-4xl mb-6">{step.icon}</div>
                  <h3 className="text-2xl font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-white/50">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─────────────────────────────────────────────────────────── */}
      <section className="py-32 bg-black border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Trusted by 5,000+ Creators</h2>
            <p className="text-white/50">Join the community building the future of content.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Testimonials */}
            {[
              {
                name: "Mumbai Cafe",
                role: "Local Business • 12k",
                text: "My cafe sales increased 30% after I started posting daily reels using Bolo. The captions are a lifesaver!",
                color: "bg-blue-500"
              },
              {
                name: "Priya Fitness",
                role: "Influencer • 45k",
                text: "The hooks generator is crazy good. My views went from 2k avg to 15k avg in just two weeks.",
                color: "bg-pink-500"
              },
              {
                name: "Rahul Tech",
                role: "Reviewer • 2k",
                text: "Finally a tool that understands Hinglish properly. Script writing used to take me hours, now it's done in minutes.",
                color: "bg-green-500"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-apple-surface p-8 rounded-3xl border border-white/5 flex flex-col justify-between">
                <p className="text-white/80 text-lg leading-relaxed mb-8">"{testimonial.text}"</p>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">{testimonial.name}</h4>
                    <p className="text-xs text-white/40">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-32 bg-apple-bg">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">Pricing</h2>
            <p className="text-white/50 text-xl">Professional tools, pocket-friendly price.</p>
          </div>

          <div className="max-w-md mx-auto relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-apple-accent to-red-500 rounded-[34px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>

            <div className="relative bg-apple-surface rounded-[32px] p-10 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-white">Pro Creator</h3>
                  <p className="text-white/40 text-sm mt-1">Everything you need to grow.</p>
                </div>
                <span className="bg-apple-accent/10 text-apple-accent text-xs font-bold px-3 py-1 rounded-full border border-apple-accent/20">
                  POPULAR
                </span>
              </div>

              <div className="flex items-baseline text-white mb-2">
                <span className="text-5xl font-bold tracking-tight">₹299</span>
                <span className="ml-2 text-xl text-white/40">/month</span>
              </div>
              <p className="text-sm text-white/30 mb-8">Cancel anytime. No hidden fees.</p>

              <div className="space-y-4 mb-10">
                {[
                  'Unlimited Hinglish Scripts',
                  'AI Caption Generator',
                  'Viral Hook Library',
                  'HD Export (1080p)',
                  'No Watermark',
                  'Commercial License',
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check size={12} className="text-green-500" />
                    </div>
                    <span className="text-white/80 font-medium">{feat}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className="block w-full bg-white text-black rounded-xl py-4 text-center font-bold hover:bg-gray-200 transition-colors"
              >
                Start Pro Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-semibold text-center mb-12 text-white">Questions?</h2>
          <div className="space-y-4">
            {[
              { q: 'Does it support Hindi & Hinglish?', a: 'Haan bilkul! Our AI is specifically trained on Indian content data, so it writes authentic Hinglish scripts and captions that connect with local audiences.' },
              { q: 'Can I use it on my phone?', a: 'Yes! The website is 100% mobile-friendly. You can create scripts and edit straight from your phone browser.' },
              { q: 'Is there a money-back guarantee?', a: 'We offer a 7-day refund policy. If you don’t like the pro plan, just email us and we will refund ₹299 instantly. No questions asked.' },
            ].map((item, i) => (
              <div key={i} className="bg-apple-surface rounded-2xl border border-white/5 overflow-hidden">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex justify-between items-center p-6 text-left font-medium text-white hover:bg-white/5 transition"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`transform transition-transform text-white/40 ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 text-white/60 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────────────── */}
      <footer className="py-12 bg-black text-white/40 border-t border-white/5 text-sm">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Bolo</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
