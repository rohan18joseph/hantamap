import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/footer";
import { TopNav } from "@/components/nav";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Hantamap project",
  description: "Experimental map-based view of 2026 hantavirus-related reports.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg"
  }
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
