// Remove the old dynamic import
// import dynamic from 'next/dynamic';
import { Mainmenu } from "@/components/layout/mainmenu";
import DesktopBackground from "@/components/layout/desktop-background";
// Import the new wrapper component
import DynamicAppsIcons from "@/components/layout/DynamicAppsIcons";

// Remove the old dynamic import definition
/*
const AppsIcons = dynamic(() => import('@/components/apps').then(mod => mod.AppsIcons), {
  ssr: false,
  // Optional: Add a loading component if desired
  // loading: () => <p>Loading desktop...</p>,
});
*/

export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <DesktopBackground />
      <Mainmenu />
      <div className="h-full w-full flex flex-col p-4 md:p-5 lg:p-6 pt-[calc(2.25rem+1rem)] md:pt-[calc(2.25rem+1.25rem)] lg:pt-[calc(2.25rem+1.5rem)]">
        <div className="flex-1 relative">
          {/* Render the new wrapper component */}
          <DynamicAppsIcons />
        </div>
      </div>
    </div>
  );
}
