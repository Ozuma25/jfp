import type { Metadata } from "next";
import Link from "next/link";
import { fetchProductDetail, fetchProductList } from "@/lib/catalog";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductDetailClient } from "@/components/products/ProductDetailClient";
import { ReviewSection } from "@/components/products/ReviewSection";

type Props = { params: Promise<{ slug: string }> };

/* ─── Dynamic SEO metadata for every product page ─────────────────────── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await fetchProductDetail(slug);
    const title = `${product.title} — Jai Fancy Packs`;
    const description = product.description
      ? product.description.slice(0, 155).replace(/\s+/g, " ").trim() + "…"
      : `Buy ${product.title} online. Wholesale return gifts & premium packaging from Jai Fancy Packs.`;
    const image = product.images[0] ?? product.image;

    return {
      title,
      description,
      keywords: [
        product.title,
        "wholesale gift",
        "return gift",
        "fancy packs",
        "bulk packaging",
        product.sku,
      ].filter(Boolean).join(", "),
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Jai Fancy Packs",
        ...(image ? { images: [{ url: image, alt: product.title }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return {
      title: "Product — Jai Fancy Packs",
      description: "Wholesale return gifts and premium packaging.",
    };
  }
}

/* ─── Static params hint for ISR / build-time generation ──────────────── */
export async function generateStaticParams() {
  try {
    const data = await fetchProductList({ page_size: "200" });
    return data.results.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

/* ─── Page component ───────────────────────────────────────────────────── */
export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  let product;
  let error: string | null = null;
  try {
    product = await fetchProductDetail(slug);
  } catch (e) {
    error = e instanceof Error ? e.message : "Not found";
    product = null;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link href="/products" className="text-sm text-store-navy hover:underline">
          ← Back to products
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Product not found</h1>
        <p className="mt-2 text-neutral-600">{error}</p>
      </div>
    );
  }

  // Fetch related products
  const relatedData = await fetchProductList({
    cat: product.category_slug,
    page_size: "8",
  }).catch(() => ({ results: [] }));
  const relatedProducts = relatedData.results.filter((p) => p.slug !== slug).slice(0, 5);

  const galleryUrls =
    product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return (
    <div className="bg-white min-h-screen pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 md:py-10">

        {/* Breadcrumb — global single row */}
        <nav className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400 mb-8 pb-4 border-b border-gray-50">
          <Link href="/" className="hover:text-store-navy transition-colors">Home</Link>
          <span className="text-[8px] text-neutral-300">/</span>
          <Link href="/products" className="hover:text-store-navy transition-colors">Collection</Link>
          <span className="text-[8px] text-neutral-300">/</span>
          <span className="text-store-navy font-bold truncate max-w-[200px]">{product.title}</span>
        </nav>

        {/* SEO: JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org/",
              "@type": "Product",
              "name": product.title,
              "image": galleryUrls,
              "description": product.description || `Premium ${product.title} from Jai Fancy Packs`,
              "sku": product.sku,
              "brand": { "@type": "Brand", "name": "Jai Fancy Packs" },
              "offers": {
                "@type": "Offer",
                "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://jaifancypacks.com'}/products/${product.slug}`,
                "priceCurrency": "INR",
                "price": product.price.replace(/[^0-9.]/g, ''),
                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition",
              },
              ...(product.rating > 0 ? {
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": product.rating,
                  "reviewCount": product.review_count,
                },
              } : {}),
            })
          }}
        />

        {/* ProductDetailClient — all props are plain serializable data */}
        <ProductDetailClient
          productTitle={product.title}
          productSlug={product.slug}
          productSku={product.sku}
          basePrice={product.price}
          compareAtPrice={product.compare_at_price_display ?? null}
          baseImages={galleryUrls}
          baseStock={product.stock}
          minQty={product.min_qty}
          bulkThreshold={product.bulk_threshold ?? null}
          isCustomizable={product.is_customizable}
          isReturnable={product.is_returnable}
          recentSalesCount={product.recent_sales_count}
          rating={Number(product.rating)}
          reviewCount={product.review_count}
          description={product.description}
          categorySlug={product.category_slug}
          variants={product.variants ?? []}
          firstImageSrc={galleryUrls[0] ?? null}
          baseHeightCm={product.height_cm ?? null}
          baseWidthCm={product.width_cm ?? null}
          baseWeightG={product.weight_g ?? null}
        />

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-16 border-t border-gray-100">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-serif text-store-navy">You May Also <span className="text-store-button">Admire</span></h2>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  Curated pieces from the {product.category_slug.replace('-', ' ')} collection
                </p>
              </div>
              <Link
                href={`/products?cat=${product.category_slug}`}
                className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-store-navy hover:text-store-button transition-colors underline underline-offset-8"
              >
                View Collection
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.slug} product={p} compact />
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews Section */}
        <ReviewSection productId={product.id} productTitle={product.title} />

      </div>
    </div>
  );
}
