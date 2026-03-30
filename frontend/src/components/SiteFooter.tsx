import Link from "next/link";
import { IconMapPin } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="relative bg-store-navy text-white pt-32 pb-16 overflow-hidden border-t border-white/5">
      {/* 
          CONCEPT 1: EXQUISITE ATELIER 
          Huge backdrop typography for a high-fashion, premium house feel.
      */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none select-none opacity-[0.03] whitespace-nowrap">
        <span className="text-[15rem] md:text-[25rem] font-serif font-black tracking-tighter uppercase leading-none">
          JAI FANCY PACKS
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 z-10">
        <div className="grid lg:grid-cols-12 gap-16 lg:gap-24 mb-24">
          
          {/* Brand Manifesto & Identity */}
          <div className="lg:col-span-5 space-y-10">
             <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.6em] font-bold text-store-yellow mb-2">The Gifting Atelier</p>
                <h2 className="text-4xl md:text-5xl font-serif leading-[1.1]">
                   Defining Luxury <br/>
                   <span className="italic font-normal text-3xl md:text-5xl block">in Every Texture.</span>
                </h2>
             </div>
             <p className="text-neutral-400 text-base leading-relaxed max-w-md">
                Since 1994, we have been the silent architects of premium gifting. Our handcrafted boxes and bespoke arrangements are meticulously designed to elevate the art of celebration.
             </p>
             <div className="pt-4 flex gap-10">
                <div className="flex flex-col gap-1">
                   <span className="text-2xl font-serif text-store-yellow">1994</span>
                   <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Inception Year</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-2xl font-serif text-store-yellow">Nationwide</span>
                   <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Delivery Network</span>
                </div>
             </div>
          </div>

          {/* Boutique Navigation & Contacts */}
          <div className="lg:col-span-7 grid md:grid-cols-2 gap-12 lg:gap-16">
             
             {/* Dynamic Links */}
             <div className="space-y-10">
                <div className="space-y-8">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30 border-b border-white/10 pb-4">Curation</h4>
                   <ul className="space-y-3 text-sm font-medium">
                      <li><Link href="/products" className="text-neutral-300 hover:text-store-yellow transition-all flex items-center justify-between group"><span>All Collections</span> <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">→</span></Link></li>
                      <li><Link href="/wholesale" className="text-neutral-300 hover:text-store-yellow transition-all flex items-center justify-between group"><span>Wholesale Hub</span> <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">→</span></Link></li>
                      <li><Link href="/quote" className="text-neutral-300 hover:text-store-yellow transition-all flex items-center justify-between group"><span>Bulk Inquiries</span> <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">→</span></Link></li>
                      <li><Link href="/account/orders" className="text-neutral-300 hover:text-store-yellow transition-all flex items-center justify-between group"><span>Track Selection</span> <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">→</span></Link></li>
                   </ul>
                </div>
                <div className="space-y-8">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30 border-b border-white/10 pb-4">Policy</h4>
                   <ul className="space-y-3 text-xs font-bold uppercase tracking-widest">
                      <li><Link href="/privacy" className="text-neutral-500 hover:text-white transition-colors">Privacy</Link></li>
                      <li><Link href="/terms" className="text-neutral-500 hover:text-white transition-colors">Terms of Service</Link></li>
                      <li><Link href="/shipping" className="text-neutral-500 hover:text-white transition-colors">Shipping & Returns</Link></li>
                   </ul>
                </div>
             </div>

             {/* The Master Contact Block */}
             <div className="bg-white/5 backdrop-blur-sm p-10 lg:p-14 border-l border-store-yellow/20 space-y-10 relative lg:-mr-12 xl:-mr-24 min-w-[320px] md:min-w-0">
                <div className="space-y-8">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-store-yellow">Direct Contact</h4>
                   <div className="space-y-6">
                      <div className="space-y-2">
                         <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold block">The Atelier Email</span>
                         <a href="mailto:contact@jaifancypacks.com" className="text-base md:text-lg font-serif text-white hover:text-store-yellow transition-colors underline decoration-store-yellow/20 underline-offset-8">contact@jaifancypacks.com</a>
                      </div>
                      <div className="space-y-2">
                         <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold block">Assistance Hotline</span>
                         <div className="flex flex-col gap-1">
                            <a href="tel:+919965549595" className="text-base text-white hover:text-store-yellow transition-colors font-medium tracking-tight whitespace-nowrap">+91-99655 49595</a>
                            <a href="tel:+919363883299" className="text-base text-white hover:text-store-yellow transition-colors font-medium tracking-tight whitespace-nowrap">+91-93638 83299</a>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-6 pt-4">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-store-yellow">Flagship Presence</h4>
                   <div className="flex gap-4">
                      <IconMapPin className="h-5 w-5 text-store-yellow shrink-0 mt-1" />
                      <p className="text-sm text-neutral-300 leading-relaxed italic">
                         481/1, Thiru nagar 1st street, <br/>Sundakkamuthur bypass road, <br/><b>Coimbatore 641026</b>
                      </p>
                   </div>
                </div>
             </div>

          </div>
        </div>

        {/* Final Branding & Legal */}
        <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-4">
              <span className="h-1.5 w-1.5 rounded-full bg-store-yellow shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
              <p className="text-[11px] uppercase tracking-[0.4em] font-bold text-neutral-400">
                Premium Boutique Heritage
              </p>
           </div>
           
           <div className="text-center md:text-right space-y-2">
              <p className="text-[11px] uppercase font-bold text-neutral-400 tracking-widest">
                © Copyright {new Date().getFullYear()} Jai Fancy Packs — Crafted for Excellence
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">
                Designed and developed by <a href="https://newgensaga.com" target="_blank" rel="noopener noreferrer" className="text-store-yellow hover:text-white transition-colors">Newgen Saga</a>
              </p>
           </div>
        </div>
      </div>
    </footer>
  );
}
