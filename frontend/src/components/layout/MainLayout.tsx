import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, Bell, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/cn'

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Get current page title based on path
  const getPageTitle = () => {
    const path = location.pathname.split('/')[1]
    if (!path || path === 'dashboard') return 'Dashboard'
    return path.charAt(0).toUpperCase() + path.slice(1)
  }

  return (
    <div className="min-h-screen bg-apple-bg font-sans text-apple-text-primary selection:bg-apple-accent/30 selection:text-white">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block fixed left-0 top-0 h-screen w-[80px] lg:w-[280px] z-30">
        <Sidebar variant="desktop" />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden bg-apple-surface shadow-2xl border-r border-white/10"
            >
              <Sidebar variant="mobile" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="md:ml-[80px] lg:ml-[280px] min-h-screen flex flex-col transition-all duration-300">
        {/* Topbar */}
        <header 
          className={cn(
            "h-[60px] sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between transition-all duration-300",
            scrolled ? "bg-black/40 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
          )}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-white/70 hover:bg-white/10 rounded-full md:hidden transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-white/90 hidden md:block tracking-tight">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Search Bar */}
            <div className="hidden sm:flex items-center relative group">
              <Search size={16} className="absolute left-3 text-white/40 group-focus-within:text-apple-accent transition-colors" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 w-48 md:w-64 bg-white/5 border border-white/10 rounded-full text-sm placeholder-white/30 text-white focus:outline-none focus:bg-white/10 focus:w-72 focus:border-apple-accent/50 transition-all duration-300 input-field"
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-black shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              </button>
              
              <button className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-apple-accent to-orange-400 text-white font-medium text-sm hover:shadow-[0_0_15px_rgba(255,149,0,0.4)] transition-shadow">
                T
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-8 overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
             <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
