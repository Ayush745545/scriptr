

import { FileText, Subtitles, Image, Zap, ArrowRight, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const ActionCard = ({ to, icon: Icon, title, titleHi, subtitle, size = 'small', color = 'accent' }: any) => (
    <Link
        to={to}
        className={`
      relative overflow-hidden rounded-3xl border border-white/10 group
      ${size === 'large' ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}
      bg-card/40 hover:bg-card/60 transition-all duration-300
    `}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="p-6 h-full flex flex-col justify-between relative z-10">
            <div className={`
        w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110
        ${color === 'accent' ? 'bg-accent/20 text-accent' : ''}
        ${color === 'green' ? 'bg-success/20 text-success' : ''}
        ${color === 'blue' ? 'bg-info/20 text-info' : ''}
        ${color === 'orange' ? 'bg-warning/20 text-warning' : ''}
      `}>
                <Icon size={24} />
            </div>

            <div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-accent transition-colors flex flex-col items-start gap-0.5">
                    <span>{title}</span>
                    <span className="opacity-70 text-sm font-normal font-hindi text-text-secondary">{titleHi}</span>
                </h3>
                <p className="text-sm text-text-tertiary mt-2">{subtitle}</p>
            </div>

            {size === 'large' && (
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <ArrowRight size={20} className="text-white" />
                    </div>
                </div>
            )}
        </div>
    </Link>
);

export default function QuickActions() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Large Card */}
            <ActionCard
                to="/scripts"
                icon={FileText}
                title="Generate Script"
                titleHi="स्क्रिप्ट बनाएं"
                subtitle="AI-powered scripts for YouTube & Reels"
                size="large"
                color="accent"
            />

            {/* Small Cards */}
            <ActionCard
                to="/captions"
                icon={Subtitles}
                title="Captions"
                titleHi="कैप्शन"
                subtitle="Auto-transcribe & style"
                size="small"
                color="green"
            />

            <ActionCard
                to="/thumbnails"
                icon={Image}
                title="Thumbnails"
                titleHi="थंबनेल"
                subtitle="Create click-worthy covers"
                size="small"
                color="blue"
            />

            <ActionCard
                to="/hooks"
                icon={Zap}
                title="Viral Hooks"
                titleHi="हुक्स"
                subtitle="Get attention instantly"
                size="small"
                color="orange"
            />

            <div className="col-span-1 row-span-1 rounded-3xl border border-dashed border-white/20 flex items-center justify-center bg-transparent hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Video size={20} className="text-text-tertiary group-hover:text-white" />
                    </div>
                    <span className="text-sm text-text-tertiary group-hover:text-white">New Project</span>
                </div>
            </div>
        </div>
    );
}
