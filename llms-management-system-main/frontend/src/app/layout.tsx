import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Laboratory Management System",
  description: "Multi-tenant Laboratory Management System",
};

/**
 * Re-render reasoning:
 * 1. RootLayout operates as a React Server Component: its component shell is static and does not re-render.
 * 2. Providers are wired in a strict, stable nesting order:
 *    - NuqsAdapter: outermost adapter for URL state synchronization without Context re-render cascades.
 *    - ThemeProvider: next-themes class provider with stable attributes and disableTransitionOnChange.
 *    - QueryProvider: client provider wrapping a stable QueryClient singleton initialized once.
 * 3. None of these top-level providers pass dynamic or fast-changing context values, isolating
 *    leaf component re-renders strictly to their subscribed state slices.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette="navy"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem("lms-palette");if(p==="cream"||p==="navy"){document.documentElement.setAttribute("data-palette",p);}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col font-sans"
      >
        <NuqsAdapter>
          <ThemeProvider>
            <QueryProvider>
              {children}
              <Toaster position="bottom-right" />
            </QueryProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
