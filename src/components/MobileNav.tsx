"use client";

import {
  BarChart3,
  FileText,
  Mic,
  Package,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Counter", icon: Mic },
  { href: "/hisaab", label: "Hisaab", icon: BarChart3 },
  { href: "/items", label: "Items", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/bills", label: "Bills", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 flex items-center justify-around border-t border-stone-200 bg-white px-1 py-1 sm:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium ${
              active ? "text-orange-600 font-bold" : "text-stone-500"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
