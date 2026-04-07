import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function HomeSkeleton() {
  return (
    <div className="w-full space-y-12 pb-20">
      {/* Hero Skeleton */}
      <section className="relative h-[60vh] md:h-[80vh] w-full">
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="w-full max-w-2xl px-4 space-y-6">
            <div className="flex justify-center">
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
            <Skeleton className="h-16 md:h-24 w-full" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <div className="flex justify-center pt-4">
              <Skeleton className="h-12 w-48" />
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid Skeleton */}
      <section className="max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center mb-10 text-center">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-4">
              <Skeleton className="aspect-square w-full rounded-full max-w-[160px]" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </section>

      {/* Product Sections Skeleton */}
      <section className="max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-end mb-10">
          <div className="space-y-4">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-32 hidden md:block" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Promo Banners Skeleton */}
      <section className="max-w-screen-2xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-64 md:h-80 w-full rounded-2xl" />
          <Skeleton className="h-64 md:h-80 w-full rounded-2xl" />
        </div>
      </section>

      {/* Trust Bar Skeleton */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center text-center space-y-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
