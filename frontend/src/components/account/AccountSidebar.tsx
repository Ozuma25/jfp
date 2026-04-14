"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  IconUser,
  IconShoppingBag,
  IconMapPin,
  IconCreditCard,
  IconLogout,
} from "@/components/icons";

const menuItems = [
  { href: "/account", label: "Profile", icon: IconUser },
  { href: "/account/orders", label: "Orders", icon: IconShoppingBag },
  { href: "/account/quotes", label: "My Quotes", icon: IconCreditCard },
  { href: "/account/addresses", label: "Addresses", icon: IconMapPin },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-full md:w-56 shrink-0">
      <nav className="flex flex-col space-y-1.5 sticky top-28">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-bold tracking-wide transition-all ${
                isActive
                  ? "bg-store-navy/5 text-store-navy"
                  : "text-neutral-500 hover:text-store-navy hover:bg-black/[0.02]"
              }`}
            >
              <div className={`transition-transform duration-300 ${isActive ? "scale-110 text-store-navy" : "text-neutral-400 group-hover:text-store-navy"}`}>
                <Icon className="h-4 w-4" />
              </div>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-store-button"></div>
              )}
            </Link>
          );
        })}
        <div className="pt-4 mt-2 border-t border-gray-100/60">
          <button
            onClick={() => logout()}
            className="group flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-bold tracking-wide text-neutral-500 transition-all hover:text-red-600 hover:bg-red-50/50"
          >
            <div className="text-neutral-400 group-hover:text-red-500 transition-colors">
              <IconLogout className="h-4 w-4" />
            </div>
            Logout
          </button>
        </div>
      </nav>
    </aside>
  );
}
