"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, Heart, MessageSquare, User } from "lucide-react";
import { cn, dashboardPathForRole } from "@/lib/utils";

export default function BottomNav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/saved", label: "Saved", icon: Heart },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    {
      href: session?.user
        ? dashboardPathForRole(session.user.role)
        : "/login",
      label: "Profile",
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white md:hidden">
      <div className="flex items-center justify-around py-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-brand-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <link.icon className={cn("h-5 w-5", isActive && "text-brand-600")} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
