import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function Hero() {
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

    return (
        <div className="relative overflow-hidden rounded-3xl p-8 mb-8 border border-white/10 group">
            {/* Background Mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-background to-background opacity-50 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[80px] rounded-full" />

            <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/10 border border-white/5 text-xs text-accent backdrop-blur-md">
                        <Sparkles size={12} className="mr-1" />
                        AI Creative Assistant
                    </span>
                </div>

                <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2 tracking-tight">
                    <span className="text-gradient-accent">{greeting}</span>, Creator
                </h1>
                <p className="text-text-secondary text-lg max-w-lg">
                    Ready to make something <span className="text-white font-medium">amazing/शानदार</span> today?
                </p>
            </div>
        </div>
    );
}
