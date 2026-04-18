import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { HomeProductSections } from "@/components/home/HomeProductSections";
import { BlogSection } from "@/components/home/BlogSection";
import { PromoBanners } from "@/components/home/PromoBanners";
import { TrustBar } from "@/components/home/TrustBar";
import { VideoStrip } from "@/components/home/VideoStrip";
import { ShopByOccasion } from "@/components/home/ShopByOccasion";
import { FestiveDivider } from "@/components/ui/FestiveDivider";
import { FestiveBackground } from "@/components/ui/FestiveBackground";

export default function HomePage() {
  return (
    <>
      <HeroCarousel />

      {/* Category Grid with gift box silhouette watermarks */}
      <div className="relative">
        <FestiveBackground variant="gifts" />
        <CategoryGrid />
      </div>

      <FestiveDivider variant="toran" />

      {/* Shop by Occasion with marigold watermarks */}
      <div className="relative">
        <FestiveBackground variant="marigold" />
        <ShopByOccasion />
      </div>

      <FestiveDivider variant="diya" />

      {/* Products section with rangoli corner accents */}
      <div className="relative">
        <FestiveBackground variant="rangoli" />
        <HomeProductSections />
      </div>

      <PromoBanners />

      <FestiveDivider variant="rangoli" />

      <TrustBar />
      <VideoStrip />
      <BlogSection />
    </>
  );
}
