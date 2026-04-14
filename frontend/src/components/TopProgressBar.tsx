"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Stop the loading bar the moment the URL successfully changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the closest anchor tag that was clicked
      const target = (e.target as Element).closest("a");
      if (!target || !target.href) return;
      
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(target.href);

        // Ensure it's an internal application link, not an external or new-tab link
        if (
          currentUrl.origin === targetUrl.origin &&
          target.target !== "_blank" &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.shiftKey
        ) {
          // Check if we are actually navigating to a new path or new param
          if (currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search) {
            setIsNavigating(true);
          }
        }
      } catch (err) {
        // Ignore invalid URLs
      }
    };

    // Use capture phase to ensure it catches before potential preventDefaults depending on Next version
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[999999] pointer-events-none">
      {/* Dynamic expanding progress bar */}
      <div className="h-1 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37] w-full origin-left animate-[global-progress_10s_cubic-bezier(0.1,0.8,0.2,1)_forwards]"></div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes global-progress {
          0% { transform: scaleX(0); }
          15% { transform: scaleX(0.3); }
          50% { transform: scaleX(0.6); }
          80% { transform: scaleX(0.85); }
          100% { transform: scaleX(0.95); }
        }
      `}} />
    </div>
  );
}
