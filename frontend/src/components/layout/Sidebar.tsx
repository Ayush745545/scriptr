import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Subtitles,
  LayoutTemplate,
  Image,
  Zap,
  Folder
} from 'lucide-react';

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', subLabel: 'डैशबोर्ड', path: '/' },
  { icon: FileText, label: 'Scripts', subLabel: 'स्क्रिप्ट', path: '/scripts' },
  { icon: Subtitles, label: 'Captions', subLabel: 'कैप्शन', path: '/captions' },
  { icon: LayoutTemplate, label: 'Templates', subLabel: 'टेम्पलेट', path: '/templates' },
  { icon: Image, label: 'Thumbnails', subLabel: 'थंबनेल', path: '/thumbnails' },
  { icon: Zap, label: 'Hooks', subLabel: 'हुक्स', path: '/hooks' },
  { icon: Folder, label: 'Projects', subLabel: 'प्रोजेक्ट', path: '/projects' },
];

export default function Sidebar({ variant: _variant = 'desktop' }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 transition-all duration-300 ease-in-out border-r border-white/10 ${isExpanded ? 'w-[280px]' : 'w-[80px]'
        }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="absolute inset-0 bg-surface/60 backdrop-blur-xl" />

      <div className="relative z-10 flex flex-col h-full py-6">
        {/* Logo Area */}
        <div className={`flex items-center px-4 mb-10 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <div className={`ml-3 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
            <h1 className="text-white font-display font-bold text-xl">Bolo</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                relative flex items-center px-3 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                  ? 'bg-white/10 text-white shadow-lg shadow-black/5'
                  : 'text-text-secondary hover:text-white hover:bg-white/5'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 w-1 h-8 bg-accent rounded-r-full shadow-[0_0_10px_rgba(255,149,0,0.5)]" />
                  )}

                  <div className={`flex flex-col items-center justify-center w-10 h-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <item.icon size={24} strokeWidth={1.5} className={isActive ? 'text-accent drop-shadow-[0_0_8px_rgba(255,149,0,0.5)]' : ''} />
                  </div>

                  <div className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                    <div className="flex flex-col justify-center items-start">
                      <span className="font-medium text-sm leading-tight text-white">{item.label}</span>
                      <span className="text-[10px] text-text-tertiary leading-tight font-hindi mt-0.5">{item.subLabel}</span>
                    </div>
                  </div>

                  {isActive && isExpanded && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(255,149,0,0.8)]" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="mt-auto px-4">
          <div className={`bg-white/5 rounded-2xl p-2 flex items-center transition-all duration-300 border border-white/5 ${isExpanded ? 'justify-start' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">AK</span>
            </div>
            <div className={`ml-3 overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>
              <p className="text-sm font-medium text-white">Ayush Kumar</p>
              <p className="text-xs text-text-tertiary">Pro Plan</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

