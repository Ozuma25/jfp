import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-[100%] animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
