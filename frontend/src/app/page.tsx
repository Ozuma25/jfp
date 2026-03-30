import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { HomeProductSections } from "@/components/home/HomeProductSections";
import { BlogSection } from "@/components/home/BlogSection";
import { PromoBanners } from "@/components/home/PromoBanners";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { TrustBar } from "@/components/home/TrustBar";
import { VideoStrip } from "@/components/home/VideoStrip";

export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <CategoryGrid />
      <HomeProductSections />
      <PromoBanners />
      <TrustBar />
      <VideoStrip />
      <TestimonialSlider />
      <BlogSection />
    </>
  );
}
