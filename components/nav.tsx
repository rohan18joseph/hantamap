import Link from "next/link";
import { ThemeToggle } from "@/components/theme-provider";

const navItems = [
  ["Overview", "/"],
  ["Map", "/maps"],
  ["Risk Lens", "/risk"],
  ["Reports", "/reports"],
  ["Methodology", "/methodology"],
  ["Sources", "/sources"]
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="shell flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Hantamap project
        </Link>
        <nav className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900 md:flex">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
