import Image from "next/image";
import Link from "next/link";

/** Placeholder “store tour / reels” strip — swap URLs when you have real media */
const tiles = [
  {
    href: "#",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80",
    label: "Store tour",
  },
  {
    href: "#",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",
    label: "New arrivals",
  },
  {
    href: "#",
    img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80",
    label: "Packaging ideas",
  },
  {
    href: "#",
    img: "https://images.unsplash.com/photo-1512909006721-3d6018887383?w=400&q=80",
    label: "Hampers",
  },
];

export function VideoStrip() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-xl font-bold text-neutral-900 md:text-2xl">
          See us in action
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tiles.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="group relative w-[140px] shrink-0 overflow-hidden rounded-2xl bg-neutral-900 sm:w-[160px]"
            >
              <div className="relative aspect-[9/16]">
                <Image
                  src={t.img}
                  alt=""
                  fill
                  className="object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
                  sizes="160px"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 to-transparent p-3">
                  <span className="text-xs font-semibold text-white">{t.label}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
