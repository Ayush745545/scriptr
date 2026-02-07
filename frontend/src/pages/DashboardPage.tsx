

import Hero from '../components/dashboard/Hero';
import QuickActions from '../components/dashboard/QuickActions';
import ActivityRings from '../components/dashboard/ActivityRings';
import RecentProjects from '../components/dashboard/RecentProjects';
import FeaturedTemplates from '../components/dashboard/FeaturedTemplates';

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <Hero />

      <QuickActions />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 h-full">
          <RecentProjects />
        </div>
        <div className="lg:col-span-1 h-full">
          <ActivityRings />
        </div>
      </div>

      <FeaturedTemplates />
    </div>
  );
}
