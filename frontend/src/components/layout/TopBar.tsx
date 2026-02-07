import { useEffect, useState } from 'react';
import { Search, Bell } from 'lucide-react';

interface TopBarProps {
    title?: string;
}

export default function TopBar({ title = 'Dashboard' }: TopBarProps) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 right-0 left-0 z-40 h-[60px] flex items-center justify-between px-8 transition-all duration-300 ${scrolled
                ? 'bg-background/80 backdrop-blur-xl border-b border-white/10 shadow-sm'
                : 'bg-transparent'
                }`}
            style={{ paddingLeft: 'calc(80px + 2rem)' }} // Offset for sidebar
        >
            <div className="flex items-center">
                <h1 className={`text-xl font-display font-semibold text-white transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}>
                    {title}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Search */}
                <div className={`relative group transition-all duration-300 ${scrolled ? 'w-64' : 'w-10 hover:w-64'}`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-text-tertiary group-hover:text-white transition-colors" />
                    </div>
                    <input
                        type="text"
                        className={`
              block w-full pl-10 pr-3 py-2 border border-transparent rounded-full leading-5 
              text-white placeholder-text-tertiary focus:outline-none focus:bg-white/10
              focus:border-white/20 focus:placeholder-white/50 sm:text-sm transition-all duration-300
              ${scrolled ? 'bg-white/5' : 'bg-transparent hover:bg-white/5 cursor-pointer focus:cursor-text'}
            `}
                        placeholder={scrolled ? "Search..." : ""}
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-text-tertiary hover:text-white transition-colors duration-200 rounded-full hover:bg-white/10">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-accent ring-2 ring-background transform translate-x-1/2 -translate-y-1/2" />
                </button>
            </div>
        </header>
    );
}
