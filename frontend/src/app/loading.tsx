import { HomeSkeleton } from "@/components/home/HomeSkeleton";

export default function RootLoading() {
  return (
    <>
      <div className="fixed top-0 left-0 w-full z-[99999] pointer-events-none">
        {/* Top indeterminate progress bar to signal navigation */}
        <div className="h-1 bg-gray-200 w-full overflow-hidden">
          <div className="h-full bg-store-primary bg-[#004B6E] w-[30%] origin-left animate-in fade-in slide-in-from-left-full duration-1000 repeat-infinite" style={{ animation: 'indeterminate-progress 1.5s infinite linear' }}></div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes indeterminate-progress {
            0% { transform: translateX(-100%) scaleX(0.2); }
            50% { transform: translateX(0) scaleX(0.5); }
            100% { transform: translateX(200%) scaleX(0.2); }
          }
        `}} />
      </div>
      
      {/* Page skeleton */}
      <div className="animate-in fade-in duration-500">
        <HomeSkeleton />
      </div>
    </>
  );
}
