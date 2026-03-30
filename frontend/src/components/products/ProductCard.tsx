import Image from "next/image";
import Link from "next/link";
import { IconStar } from "@/components/icons";
import type { ProductCard as ProductType } from "@/lib/catalog";
import { WishlistButton } from "@/components/products/WishlistButton";

type Props = {
  product: ProductType;
};

export function ProductCard({ product }: Props) {
  const { slug, title, price, image, rating, review_count, badge } = product;

  return (
    <Link href={`/products/${slug}`} className="group block h-full">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 shadow-card transition-all duration-300 group-hover:shadow-lg">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 20vw"
            unoptimized={
              image.startsWith("http://127.0.0.1") ||
              image.startsWith("http://localhost")
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500 uppercase tracking-widest bg-neutral-50">
            No image
          </div>
        )}
        
        {badge && (
          <div className="absolute left-2 top-2 z-10 rounded bg-store-button px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {badge}
          </div>
        )}
        
        <div className="absolute right-2 top-2 z-20 flex flex-col gap-2">
           <WishlistButton productId={product.id} productSlug={product.slug} variant="icon" />
           {product.is_customizable && (
             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-store-navy shadow-md backdrop-blur-sm" title="Customizable Design Available">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
             </div>
           )}
        </div>
      </div>
      
      <div className="mt-3 px-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-store-navy/40">
           {product.category_slug.replace('-', ' ')}
        </p>
        <p className="mt-1 text-sm font-semibold leading-tight text-store-navy group-hover:text-store-link line-clamp-2 transition-colors">
          {title}
        </p>
        
        <div className="mt-2 flex items-center justify-between">
            <p className="font-bold text-store-link text-base tracking-tight">{price}</p>
            
            {review_count > 0 && (
              <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-0.5 rounded shadow-sm border border-neutral-100">
                <IconStar className="h-3 w-3 text-store-button" filled={true} />
                <span className="text-[10px] font-bold text-store-navy/70">{rating.toFixed(1)}</span>
                <span className="text-[9px] font-medium text-neutral-400">({review_count})</span>
              </div>
            )}
        </div>
      </div>
    </Link>
  );
}
