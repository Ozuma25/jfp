import { CloudImage } from "@/components/ui/CloudImage";
import Link from "next/link";
import { IconStar } from "@/components/icons";
import type { ProductCard as ProductType } from "@/lib/catalog";

type Props = {
  product: ProductType;
  /** Smaller image, type, and badges — for dense grids (e.g. related products). */
  compact?: boolean;
};

export function ProductCard({ product, compact = false }: Props) {
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

  const imgSizes = compact
    ? "(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
    : "(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw";

  return (
    <Link href={`/products/${slug}`} className="group block h-full">
      {/* 
        Image Container 
        Using aspect-[4/5] and heavily rounded corners to match the requested design.
        No heavy box-shadow to maintain the clean modern grid look.
      */}
      <div
        className={`relative overflow-hidden bg-neutral-100 transition-all duration-300 ${
          compact ? "aspect-[4/5] rounded-xl" : "aspect-[4/5] rounded-2xl"
        }`}
      >
        {image ? (
          <CloudImage
            src={image}
            alt={title}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${product.stock <= 0 ? 'grayscale opacity-60' : ''}`}
            sizes={imgSizes}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500 uppercase tracking-widest bg-[#f7f7f7]">
            No image
          </div>
        )}

        {/* Floating Pill Badges */}
        {badge && (
          <div
            className={`absolute z-10 rounded-full font-bold tracking-wide shadow-sm ${
              compact
                ? `left-2 top-2 px-2 py-0.5 text-[8px] sm:text-[9px] ${badgeStyle}`
                : `left-3 top-3 px-3 py-1 text-[10px] sm:text-[11px] ${badgeStyle}`
            }`}
          >
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
          <div
            className={`absolute top-0 right-0 z-10 overflow-hidden pointer-events-none ${
              compact ? "w-10 h-10" : "w-14 h-14"
            }`}
          >
            <div
              className={`absolute text-center font-extrabold uppercase text-white bg-gradient-to-r from-store-button to-[#C59B27] rotate-45 shadow-sm ${
                compact
                  ? "top-[3px] right-[-14px] w-[52px] text-[5px] tracking-[0.12em] py-[1px]"
                  : "top-[5px] right-[-18px] w-[68px] text-[6px] tracking-[0.15em] py-[2.5px]"
              }`}
            >
              🎁 Gift
            </div>
          </div>
        )}
      </div>

      {/* 
        Text Container 
        Clean left-aligned typography matching the screenshot
      */}
      <div className={`flex flex-col ${compact ? "mt-2.5 gap-0.5 px-0.5" : "mt-4 gap-1 px-1"}`}>
        <p
          className={`font-medium leading-[1.3] text-[#1c2434] line-clamp-2 transition-colors ${
            compact ? "text-[11px] sm:text-[12px]" : "text-[14px]"
          }`}
        >
          {title}
        </p>

        <div className={`flex items-center justify-between ${compact ? "mt-0.5" : "mt-1"}`}>
          <p
            className={`font-normal text-[#64748b] tracking-tight ${
              compact ? "text-[11px] sm:text-[12px]" : "text-[13px]"
            }`}
          >
            {price}
          </p>

          {/* Reviews (Kept but integrated cleanly) */}
          {review_count > 0 && (
            <div className={`flex items-center gap-0.5 opacity-80 ${compact ? "scale-90 origin-right" : "gap-1"}`}>
              <IconStar className="h-3 w-3 text-store-yellow" filled={true} />
              <span className={`font-medium text-slate-500 ${compact ? "text-[10px]" : "text-[11px]"}`}>
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
