

import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
    const location = useLocation();

    // Extract title from path
    const getTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/scripts': return 'Scripts';
            case '/captions': return 'Captions';
            case '/templates': return 'Templates';
            case '/thumbnails': return 'Thumbnails';
            case '/hooks': return 'Hooks';
            case '/projects': return 'Projects';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="min-h-screen bg-background text-text-primary selection:bg-accent/30 font-sans">
            <Sidebar />
            <TopBar title={getTitle()} />

            <main
                className="pl-[80px] pt-[80px] min-h-screen transition-all duration-300"
            >
                <div className="max-w-[1400px] mx-auto px-8 pb-12 animate-fade-in">
                    <Outlet />
                </div>
            </main>

            {/* Ambient background glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />
                <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px]" />
            </div>
        </div>
    );
}
