import Image from "next/image";
import Link from "next/link";

const posts = [
  {
    title: "Choosing the right gift box for weddings",
    excerpt: "Sizes, materials, and bulk tips for event planners.",
    date: "Mar 12, 2026",
    href: "/blog/gift-boxes-weddings",
    image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&q=80",
  },
  {
    title: "Trends in eco-friendly packaging",
    excerpt: "What retailers are asking for this season.",
    date: "Mar 5, 2026",
    href: "/blog/eco-packaging",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&q=80",
  },
  {
    title: "How to place a bulk quote",
    excerpt: "Step-by-step: from request to admin approval.",
    date: "Feb 28, 2026",
    href: "/blog/bulk-quote-guide",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  },
  {
    title: "Baking supplies checklist for bakeries",
    excerpt: "Stock the essentials your customers love.",
    date: "Feb 20, 2026",
    href: "/blog/bakery-checklist",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80",
  },
];

export function BlogSection() {
  return (
    <section className="border-t border-neutral-200 bg-neutral-50 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-8 text-2xl font-bold text-store-link md:text-3xl">
          From the blog
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <article
              key={post.href}
              className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-neutral-100"
            >
              <Link href={post.href} className="block">
                <div className="relative aspect-[4/3] bg-neutral-100">
                  <Image
                    src={post.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                </div>
              </Link>
              <div className="p-4">
                <time className="text-xs text-neutral-500">{post.date}</time>
                <Link href={post.href}>
                  <h3 className="mt-1 line-clamp-2 font-semibold text-neutral-900 hover:text-store-link">
                    {post.title}
                  </h3>
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{post.excerpt}</p>
                <Link
                  href={post.href}
                  className="mt-3 inline-block text-sm font-semibold text-store-navy hover:underline"
                >
                  Read more
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
