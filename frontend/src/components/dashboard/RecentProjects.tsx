

import { MoreHorizontal, ChevronRight, Clock } from 'lucide-react';

const projects = [
    { id: 1, title: 'Goa Trip Vlog 2024', type: 'Script', status: 'Draft', date: '2h ago', icon: '📝' },
    { id: 2, title: 'Tech Review: iPhone 16', type: 'Caption', status: 'Processing', date: '5h ago', icon: '⚡' },
    { id: 3, title: 'Street Food Delhi', type: 'Thumbnail', status: 'Done', date: '1d ago', icon: '🖼️' },
    { id: 4, title: 'Crypto Basics Hindi', type: 'Script', status: 'Done', date: '2d ago', icon: '📝' },
];

export default function RecentProjects() {
    return (
        <div className="glass-card rounded-3xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Projects</h3>
                <button className="text-text-tertiary hover:text-white transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg border border-white/5 group-hover:border-white/10 transition-colors shadow-sm">
                                {project.icon}
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-white group-hover:text-accent transition-colors">{project.title}</h4>
                                <div className="flex items-center text-xs text-text-tertiary mt-1">
                                    <span>{project.type}</span>
                                    <div className="w-1 h-1 rounded-full bg-text-tertiary/50 mx-2" />
                                    <Clock size={10} className="mr-1 opacity-70" />
                                    <span>{project.date}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <span className={`
                text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border shadow-sm
                ${project.status === 'Done' ? 'bg-success/10 text-success border-success/20' : ''}
                ${project.status === 'Processing' ? 'bg-warning/10 text-warning border-warning/20' : ''}
                ${project.status === 'Draft' ? 'bg-white/10 text-text-secondary border-white/10' : ''}
              `}>
                                {project.status}
                            </span>
                            <button className="text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-white transition-all">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-text-tertiary">No projects yet</p>
                        <button className="mt-2 text-accent text-sm font-medium hover:underline">Create New</button>
                    </div>
                )}
            </div>
        </div>
    );
}
