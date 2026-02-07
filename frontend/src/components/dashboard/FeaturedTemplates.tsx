

import { Play } from 'lucide-react';

const templates = [
    { id: 1, title: 'Cinematic Vlog', type: 'Travel', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=400' },
    { id: 2, title: 'Tech Review', type: 'Tech', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400' },
    { id: 3, title: 'Food Reels', type: 'Lifestyle', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400' },
    { id: 4, title: 'Finance Tips', type: 'Education', image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=400' },
    { id: 5, title: 'Finance Tips', type: 'Education', image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=400' },
];

export default function FeaturedTemplates() {
    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Featured Templates / <span className="text-lg font-normal text-text-tertiary font-hindi">टेम्पलेट</span></h3>
                <button className="text-sm text-accent hover:text-accent-hover transition-colors">View All</button>
            </div>

            <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                {templates.map((template, index) => (
                    <div
                        key={index}
                        className="relative flex-none w-64 aspect-video rounded-2xl overflow-hidden group cursor-pointer snap-start"
                    >
                        <img
                            src={template.image}
                            alt={template.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Play size={20} className="text-white fill-current ml-1" />
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1 block">{template.type}</span>
                            <h4 className="text-white font-medium truncate">{template.title}</h4>
                        </div>

                        {index === 0 && (
                            <div className="absolute top-3 left-3 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                NEW
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
