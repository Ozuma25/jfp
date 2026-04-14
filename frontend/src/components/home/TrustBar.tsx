const items = [
  { icon: "🏷️", title: "Wholesale prices", desc: "Competitive bulk rates" },
  { icon: "🔒", title: "Secure payment", desc: "Trusted checkout" },
  { icon: "🚚", title: "Fast delivery", desc: "Pan-India shipping" },
  { icon: "💬", title: "Quality support", desc: "We are here to help" },
];

export function TrustBar() {
  return (
    <section className="bg-store-navy py-10 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 md:grid-cols-4 md:gap-8">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col items-center text-center">
            <span className="text-3xl" aria-hidden>
              {item.icon}
            </span>
            <p className="mt-2 font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-white/75">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
