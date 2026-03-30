import Image from "next/image";
import Link from "next/link";
import { getApiBase } from "@/lib/api";
import { fetchCategories } from "@/lib/catalog";

/** Uses first product image per category when API returns categories without images. */
async function categoriesWithThumbnails() {
  try {
    const cats = await fetchCategories();
    const base = getApiBase();
    const withImages = await Promise.all(
      cats.slice(0, 8).map(async (c) => {
        try {
          const res = await fetch(
            `${base}/api/products/?category_slug=${encodeURIComponent(c.slug)}&page_size=1`,
            { next: { revalidate: 120 } }
          );
          if (!res.ok) return { ...c, img: null as string | null };
          const data = await res.json();
          const first = data.results?.[0] as { image?: string | null } | undefined;
          return { ...c, img: first?.image ?? null };
        } catch {
          return { ...c, img: null };
        }
      })
    );
    return withImages;
  } catch {
    return null;
  }
}

export async function CategoryGrid() {
  const enriched = await categoriesWithThumbnails();
  const items =
    enriched?.map((c) => ({
      label: c.name,
      href: `/products?cat=${encodeURIComponent(c.slug)}`,
      img: c.img,
    })) ?? [];

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#F9F9F7] py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
           <h2 className="text-3xl md:text-5xl font-serif text-store-navy mb-4">Curated Collections</h2>
           <p className="text-store-navy/60 font-medium tracking-widest uppercase text-[10px] md:text-xs">Exquisite luxury for every occasion</p>
           <div className="w-16 h-[2px] bg-store-button mx-auto mt-6"></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {items.slice(0, 4).map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col items-center cursor-pointer"
            >
              <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden rounded-t-[10rem] border-x border-t border-gray-100 shadow-sm transition-all duration-700 group-hover:shadow-2xl group-hover:translate-y-[-8px]">
                {c.img ? (
                  <Image
                    src={c.img}
                    alt={c.label}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized={
                      c.img.startsWith("http://127.0.0.1") ||
                      c.img.startsWith("http://localhost")
                    }
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-xs text-neutral-500">
                    <span>No image</span>
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-store-navy/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <div className="bg-white px-6 py-2 text-[10px] uppercase font-bold tracking-widest text-store-navy transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      View Collection
                   </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                 <h3 className="text-xl font-serif text-store-navy capitalize">{c.label}</h3>
                 <span className="mt-2 text-[10px] uppercase tracking-widest font-bold text-store-button opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 inline-block">Explore Now</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
