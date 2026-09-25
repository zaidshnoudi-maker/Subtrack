"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/dashboard",
    label: "Subscriptions",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4" y="5" width="18" height="16" rx="3.5" />
        <path d="M8 10h10M8 14h10M8 18h6" />
      </svg>
    ),
  },
  {
    href: "/upcoming",
    label: "Upcoming",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4" y="6" width="18" height="16" rx="3.5" />
        <path d="M4 11h18M9 3.5v4M17 3.5v4" />
        <circle cx="13" cy="16" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="13" cy="13" r="3.5" />
        <path d="M13 3.5v2.6M13 19.9v2.6M22.5 13h-2.6M6.1 13H3.5M19.7 6.3l-1.8 1.8M8.1 17.9l-1.8 1.8M19.7 19.7l-1.8-1.8M8.1 8.1L6.3 6.3" />
      </svg>
    ),
  },
];

/** Bottom tab bar, shown on signed-in screens only. */
export function TabBar() {
  const path = usePathname() ?? "";
  if (!TABS.some((t) => path.startsWith(t.href))) return null;
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={path.startsWith(t.href) ? "page" : undefined}>
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
