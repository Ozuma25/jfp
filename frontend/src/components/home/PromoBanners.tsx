import Image from "next/image";
import Link from "next/link";

const promos = [
  {
    title: "Customized packaging",
    subtitle: "Upload your design — JPG, PNG, or PDF",
    href: "/products?custom=1",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=900&q=80",
  },
  {
    title: "Bulk order quotes",
    subtitle: "Wholesale pricing reviewed by our team",
    href: "/quote",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80",
  },
];

export function PromoBanners() {
  return (
    <section className="py-10">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-2 md:gap-6">
        {promos.map((p) => (
          <Link
            key={p.title}
            href={p.href}
            className="group relative aspect-[16/6] min-h-[140px] overflow-hidden rounded-2xl bg-store-navy"
          >
            <Image
              src={p.image}
              alt=""
              fill
              className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-store-navyLight/95 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-8 text-white">
              <p className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
                {p.title}
              </p>
              <p className="mt-1 max-w-sm text-sm text-white/90">{p.subtitle}</p>
              <span className="mt-4 inline-flex w-fit items-center rounded-md bg-store-button text-black px-4 py-2 text-xs font-bold uppercase tracking-wide hover:bg-store-buttonHover">
                Explore
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
