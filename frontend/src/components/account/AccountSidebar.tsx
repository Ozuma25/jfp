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
  { href: "/account/addresses", label: "Addresses", icon: IconMapPin },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-full md:w-64">
      <nav className="flex flex-col space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-store-navy text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <IconLogout className="h-5 w-5" />
          Logout
        </button>
      </nav>
    </aside>
  );
}
