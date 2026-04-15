import { CloudImage } from "@/components/ui/CloudImage";
import Link from "next/link";
import { resolveApiFetchUrl } from "@/lib/api";
import { fetchCategories } from "@/lib/catalog";

/** Uses first product image per category when API returns categories without images. */
async function categoriesWithThumbnails() {
  try {
    const cats = await fetchCategories();
    const withImages = await Promise.all(
      cats.slice(0, 8).map(async (c) => {
        try {
          const url = await resolveApiFetchUrl(
            `/api/products/?category_slug=${encodeURIComponent(c.slug)}&page_size=1`
          );
          const res = await fetch(url, { next: { revalidate: 120 } });
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

        <div className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16">
          {items.slice(0, 8).map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col items-center gap-4 cursor-pointer"
            >
              {/* Gold-bordered circle */}
              <div className="relative p-[3px] rounded-full bg-gradient-to-br from-[#D4AF37] via-[#F0C75E] to-[#C59B27] shadow-md transition-all duration-500 group-hover:shadow-[0_0_0_4px_rgba(212,175,55,0.25)] group-hover:scale-105">
                <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden bg-white">
                  {c.img ? (
                    <CloudImage
                      src={c.img}
                      alt={c.label}
                      fill
                      className="object-contain transition-transform duration-700 group-hover:scale-105 p-2"
                      sizes="(max-width: 640px) 112px, 144px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400 uppercase tracking-widest">
                      No image
                    </div>
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="text-center">
                <h3 className="text-[13px] md:text-sm font-semibold text-store-navy capitalize tracking-wide leading-tight group-hover:text-store-button transition-colors duration-300">
                  {c.label}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
