import { CloudImage } from "@/components/ui/CloudImage";
import Link from "next/link";
import { IconStar } from "@/components/icons";
import type { ProductCard as ProductType } from "@/lib/catalog";

type Props = {
  product: ProductType;
};

export function ProductCard({ product }: Props) {
  const { slug, title, price, image, rating, review_count, badge } = product;

  // Determine badge styling based on text
  let badgeStyle = "bg-slate-100 text-slate-800";
  if (badge) {
    const lowerBadge = badge.toLowerCase();
    if (lowerBadge.includes("sale")) {
      badgeStyle = "bg-[#f5e1e5] text-[#8e4a59]";
    } else if (lowerBadge.includes("new")) {
      badgeStyle = "bg-[#4a5568] text-white";
    } else if (lowerBadge.includes("best")) {
      badgeStyle = "bg-[#fef3c7] text-[#92400e]";
    }
  }

  return (
    <Link href={`/products/${slug}`} className="group block h-full">
      {/* 
        Image Container 
        Using aspect-[4/5] and heavily rounded corners to match the requested design.
        No heavy box-shadow to maintain the clean modern grid look.
      */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 transition-all duration-300">
        {image ? (
          <CloudImage
            src={image}
            alt={title}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${product.stock <= 0 ? 'grayscale opacity-60' : ''}`}
            sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500 uppercase tracking-widest bg-[#f7f7f7]">
            No image
          </div>
        )}

        {/* Floating Pill Badges */}
        {badge && (
          <div className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[10px] sm:text-[11px] font-bold tracking-wide shadow-sm ${badgeStyle}`}>
            {badge}
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 pointer-events-none">
            <span className="bg-white/90 text-red-600 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-md backdrop-blur-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Festive gift ribbon accent */}
        {product.stock > 0 && (
          <div className="absolute top-0 right-0 z-10 overflow-hidden w-14 h-14 pointer-events-none">
            <div className="absolute top-[5px] right-[-18px] w-[68px] text-center text-[6px] font-extrabold uppercase tracking-[0.15em] text-white bg-gradient-to-r from-store-button to-[#C59B27] py-[2.5px] rotate-45 shadow-sm">
              🎁 Gift
            </div>
          </div>
        )}
      </div>

      {/* 
        Text Container 
        Clean left-aligned typography matching the screenshot
      */}
      <div className="mt-4 px-1 flex flex-col gap-1">
        <p className="text-[14px] font-medium leading-[1.3] text-[#1c2434] line-clamp-2 transition-colors">
          {title}
        </p>

        <div className="flex items-center justify-between mt-1">
          <p className="font-normal text-[#64748b] text-[13px] tracking-tight">{price}</p>

          {/* Reviews (Kept but integrated cleanly) */}
          {review_count > 0 && (
            <div className="flex items-center gap-1 opacity-80">
              <IconStar className="h-3 w-3 text-store-yellow" filled={true} />
              <span className="text-[11px] font-medium text-slate-500">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
