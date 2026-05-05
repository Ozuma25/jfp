"use client";

import { CloudImage } from "@/components/ui/CloudImage";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

type Props = {
  images: string[];
  productTitle: string;
};

function isLocalDevUrl(url: string) {
  return (
    url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")
  );
}

export function ProductImageGallery({ images, productTitle }: Props) {
  const n = images.length;
  const [index, setIndex] = useState(0);
  const regionId = useId();
  const liveRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
  }>({ active: false, startX: 0, startY: 0 });

  const safeIndex = n === 0 ? 0 : Math.min(index, n - 1);
  const current = n > 0 ? images[safeIndex] : null;

  useEffect(() => {
    if (index > 0 && index >= n) {
      setIndex(Math.max(0, n - 1));
    }
  }, [index, n]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (n <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIndex(n - 1);
      }
    },
    [n, go]
  );

  useEffect(() => {
    if (!liveRef.current || n <= 1) return;
    liveRef.current.textContent = `Image ${safeIndex + 1} of ${n}`;
  }, [safeIndex, n]);

  if (n === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
        <div className="flex h-full items-center justify-center text-neutral-500">
          No image — upload in Django admin
        </div>
      </div>
    );
  }

  const label = `${productTitle} — product photos`;

  return (
    <div className="space-y-4">
      <div
        id={regionId}
        role="region"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="group relative aspect-square overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-xl outline-none select-none"
        onTouchStart={(e) => {
          if (n <= 1) return;
          const t = e.touches[0];
          if (!t) return;
          touchRef.current = { active: true, startX: t.clientX, startY: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (n <= 1) return;
          const st = touchRef.current;
          touchRef.current.active = false;
          const t = e.changedTouches[0];
          if (!t) return;
          const dx = t.clientX - st.startX;
          const dy = t.clientY - st.startY;
          // Only treat as swipe when horizontal intent is clear.
          if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
          if (dx < 0) go(1);
          else go(-1);
        }}
      >
        <div ref={liveRef} className="sr-only" aria-live="polite" />
        {current && (
          <CloudImage
            src={current}
            alt=""
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
            priority
            sizes="(max-width:768px) 100vw, 50vw"
          />
        )}
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-3 md:left-6 top-1/2 z-10 -translate-y-1/2 p-3 text-white/90 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
              onClick={() => go(-1)}
            >
              <IconChevronLeft className="h-10 w-10" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-3 md:right-6 top-1/2 z-10 -translate-y-1/2 p-3 text-white/90 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
              onClick={() => go(1)}
            >
              <IconChevronRight className="h-10 w-10" />
            </button>

            <div className="absolute bottom-4 md:bottom-10 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm">
              {images.map((_, i) => (
                <div key={i} className={`h-1 transition-all duration-300 ${i === safeIndex ? 'w-8 bg-store-button' : 'w-2 bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {n > 1 && (
        <div
          className="flex justify-center flex-wrap gap-3"
          role="group"
          aria-label="Product image thumbnails"
        >
          {images.map((url, i) => {
            const selected = i === safeIndex;
            return (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${selected
                  ? "border-store-button scale-110 shadow-lg"
                  : "border-transparent opacity-50 hover:opacity-100 grayscale hover:grayscale-0"
                  }`}
              >
                <CloudImage
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
