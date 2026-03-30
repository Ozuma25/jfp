import type { Metadata } from "next";
import Link from "next/link";
import { ProductAddToCart } from "@/components/ProductAddToCart";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { fetchProductDetail, fetchProductList } from "@/lib/catalog";
import { PincodeCheck } from "@/components/PincodeCheck";
import { ProductCard } from "@/components/products/ProductCard";
import { WishlistButton } from "@/components/products/WishlistButton";
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
    page_size: "5",
  }).catch(() => ({ results: [] }));
  const relatedProducts = relatedData.results.filter((p) => p.slug !== slug).slice(0, 4);

  const galleryUrls =
    product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return (
    <div className="bg-[#F9F9F7] min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 md:py-20">
        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-store-navy/40 mb-12">
          <Link href="/" className="hover:text-store-navy transition-colors">Home</Link>
          <span className="text-[8px]">/</span>
          <Link href="/products" className="hover:text-store-navy transition-colors">Collection</Link>
          <span className="text-[8px]">/</span>
          <span className="text-store-navy truncate max-w-[150px]">{product.title}</span>
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
              "brand": {
                "@type": "Brand",
                "name": "Jai Fancy Packs"
              },
              "offers": {
                "@type": "Offer",
                "url": `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://jaifancypacks.com'}/products/${product.slug}`,
                "priceCurrency": "INR",
                "price": product.price.replace(/[^0-9.]/g, ''),
                "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition"
              },
              ...(product.rating > 0 ? {
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": product.rating,
                  "reviewCount": product.review_count
                }
              } : {})
            })
          }}
        />

        <div className="flex flex-col lg:flex-row items-start justify-center gap-12 xl:gap-20">
          {/* Left: Cinematic Gallery */}
          <div className="w-full lg:w-[45%] xl:w-[40%]">
            <div className="lg:sticky lg:top-32">
              <ProductImageGallery images={galleryUrls} productTitle={product.title} />
              
              {/* Product Story - Desktop */}
              <div className="mt-20 hidden lg:block border-t border-gray-100 pt-16">
                 <h2 className="text-2xl font-serif text-store-navy mb-8">The Product Story</h2>
                 <div className="prose prose-sm prose-neutral max-w-none text-neutral-600 leading-relaxed">
                    {product.description.split('\n').filter(Boolean).map((line, i) => (
                      <p key={i} className="mb-4">{line}</p>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Right: Bespoke Details & Purchase */}
          <div className="w-full lg:w-[45%] xl:w-[45%] lg:max-w-xl">
             <div className="space-y-12">
                {/* Header */}
                <div className="space-y-4">
                   {product.is_customizable && (
                     <span className="inline-block bg-store-button text-black text-[9px] uppercase font-bold tracking-[0.2em] px-3 py-1 rounded-full shadow-sm mb-2">
                        Customizable Boutique
                     </span>
                   )}
                   <h1 className="text-4xl md:text-5xl font-serif text-store-navy leading-[1.1]">
                     {product.title}
                   </h1>
                   {product.review_count > 0 && (
                     <div className="flex items-center gap-4 text-store-button text-xs">
                        <div className="flex gap-0.5">
                           {Array.from({ length: 5 }).map((_, i) => (
                             <span key={i} className={i < Math.floor(product.rating) ? "text-store-button" : "text-gray-200"}>★</span>
                           ))}
                        </div>
                        <span className="text-neutral-400 font-bold uppercase tracking-widest text-[9px]">Verified Reviews</span>
                     </div>
                   )}
                </div>

                {/* Price Section */}
                <div className="pb-10 border-b border-gray-100">
                   <div className="flex items-baseline gap-4 mb-2">
                      <span className="text-3xl font-bold text-store-navy leading-none">{product.price}</span>
                      {product.compare_at_price_display && (
                        <span className="text-lg text-neutral-300 line-through decoration-store-button/40">{product.compare_at_price_display}</span>
                      )}
                   </div>
                   <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Inclusive of all taxes &amp; Premium Packaging</p>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-2 gap-y-6 pt-2">
                  <div className="space-y-1">
                     <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Atelier Material</p>
                     <p className="text-sm font-bold text-store-navy">Premium Gifting Grade</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Reference SKU</p>
                     <p className="text-sm font-bold text-store-navy">{product.sku}</p>
                  </div>
                </div>

                {/* Urgency & Social Proof */}
                <div className="flex flex-wrap gap-4">
                   {product.recent_sales_count > 0 && (
                     <div className="flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded shadow-sm border border-neutral-200">
                        <span className="text-lg">🔥</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-store-navy">
                           <span className="text-store-button bg-store-button/10 px-1">{product.recent_sales_count} people</span> bought this in the last 24h
                        </p>
                     </div>
                   )}
                   {product.stock > 0 && product.stock <= 10 && (
                     <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded shadow-sm border border-red-100">
                        <span className="text-lg">⏳</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">
                           Only <span className="bg-red-100 px-1">{product.stock} left</span> — Order soon
                        </p>
                     </div>
                   )}
                </div>

                {/* Purchase Box */}
                <div className="bg-white p-8 md:p-10 shadow-2xl rounded-none border-t-4 border-store-button">
                   {product.stock > 0 ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest mb-2">
                           <span className="text-green-600 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                              Currently in Stock
                           </span>
                           <span className="text-neutral-400 italic">Nationwide Shipping Available</span>
                        </div>
                        
                        <div className="space-y-6">
                           <ProductAddToCart productSlug={product.slug} minQty={product.min_qty} bulkThreshold={product.bulk_threshold} isCustomizable={product.is_customizable} imageSrc={galleryUrls[0] ?? null} />
                           
                           <WishlistButton productId={product.id} productSlug={product.slug} variant="full" />

                           {/* Delivery Serviceability Check */}
                           <div className="pt-2">
                              <PincodeCheck />
                           </div>
                        </div>
                        
                        <div className="pt-6 border-t border-gray-50 space-y-4">
                           <p className="text-[10px] text-center text-neutral-400 font-medium italic">
                              Delivery charges calculated at checkout.
                           </p>
                        </div>
                      </div>
                   ) : (
                      <div className="text-center py-10">
                         <p className="text-store-navy font-serif italic text-lg mb-4">Temporarily out of the atelier.</p>
                         <Link href="/products" className="text-store-button font-bold text-xs uppercase tracking-widest underline underline-offset-8 decoration-2">Explore Similar Pieces</Link>
                      </div>
                   )}
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-10 py-6 border-t border-gray-100">
                   <div className="flex flex-col items-center gap-2 grayscale opacity-50">
                      <span className="text-lg">🛡️</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">Secure Payments</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 grayscale opacity-50">
                      <span className="text-lg">🌿</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">Premium Materials</span>
                   </div>
                   <div className="flex flex-col items-center gap-2 grayscale opacity-50">
                      <span className="text-lg">🇮🇳</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">Made with Pride</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Product Story - Mobile Only */}
        <div className="mt-20 lg:hidden border-t border-gray-200 pt-16">
           <h2 className="text-2xl font-serif text-store-navy mb-8">The Product Story</h2>
           <div className="prose prose-sm prose-neutral max-w-none text-neutral-600 leading-relaxed">
              {product.description.split('\n').filter(Boolean).map((line, i) => (
                <p key={i} className="mb-4">{line}</p>
              ))}
           </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-32 pt-24 border-t border-gray-100">
            <div className="flex items-end justify-between mb-12">
               <div>
                  <h2 className="text-3xl md:text-4xl font-serif text-store-navy">You May Also <span className="text-store-button">Admire</span></h2>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Curated pieces from the {product.category_slug.replace('-', ' ')} collection</p>
               </div>
               <Link href={`/products?cat=${product.category_slug}`} className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-store-navy hover:text-store-button transition-colors underline underline-offset-8">View Collection</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
               {relatedProducts.map((p) => (
                 <ProductCard key={p.slug} product={p} />
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
