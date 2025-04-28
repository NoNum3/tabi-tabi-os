import { AppsIcons } from "@/components/apps";
import { Mainmenu } from "@/components/layout/mainmenu";
import DesktopBackground from "@/components/layout/desktop-background";

export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <DesktopBackground />
      <Mainmenu />
      <div className="h-full w-full flex flex-col p-4 md:p-5 lg:p-6 pt-[calc(2.25rem+1rem)] md:pt-[calc(2.25rem+1.25rem)] lg:pt-[calc(2.25rem+1.5rem)]">
        <div className="flex-1 relative">
          <AppsIcons />
        </div>
      </div>
    </div>
  );
}
