import { Outlet, Link } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Content (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-surface border-r border-white/10">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-accent/5" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-accent/20 via-background to-background opacity-40" />

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight font-display">Bolo</span>
          </Link>

          <div className="space-y-6 max-w-lg mt-20">
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight font-display">
              Create Viral Canvases <br />
              <span className="text-gradient-accent">in seconds.</span>
            </h1>
            <div className="space-y-2">
              <p className="text-xl text-white/80 font-medium">
                भारतीय क्रिएटर्स के लिए AI टूल
              </p>
              <p className="text-lg text-text-secondary">
                AI-Powered Tools for Indian Creators
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="glass-card p-6 rounded-2xl border-white/10 max-w-md">
            <p className="text-white/90 text-lg font-medium italic mb-4 leading-relaxed">
              "Bolo changed how I write scripts. It understands Hinglish perfectly!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500" />
              <div className="text-white/80 text-sm">
                <div className="font-semibold text-white">Rahul Sharma</div>
                <div className="text-text-tertiary">YouTuber (1.2M Subs)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] opacity-50" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <Outlet />

          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-text-tertiary">
              Create content in <span className="text-white/80">Hindi</span>, <span className="text-white/80">English</span>, or <span className="text-white/80">Hinglish</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
