import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { TopNav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Hantamap",
  description: "A static public-health intelligence dashboard for hantavirus reports and advisories."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-slate-950 antialiased dark:text-slate-100">
        <ThemeProvider>
          <TopNav />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
