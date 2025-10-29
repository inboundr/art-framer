import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CentralizedAuthProvider } from "@/contexts/CentralizedAuthProvider";
import { CartProvider } from "@/contexts/CartContext";
import { GenerationProvider } from "@/contexts/GenerationContext";
import { AuthDebugPanel } from "@/components/AuthDebugPanel";

const manrope = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Art Framer - Create AI Art & Order Framed Prints",
  description: "Transform your imagination into stunning artwork with AI, then order it as a beautiful framed print delivered to your doorstep.",
  keywords: "AI art, AI image generation, framed prints, custom artwork, print on demand",
  authors: [{ name: "Art Framer Team" }],
  openGraph: {
    title: "Art Framer - Create AI Art & Order Framed Prints",
    description: "Transform your imagination into stunning artwork with AI, then order it as a beautiful framed print delivered to your doorstep.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Art Framer - Create AI Art & Order Framed Prints",
    description: "Transform your imagination into stunning artwork with AI, then order it as a beautiful framed print delivered to your doorstep.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="build-version" content={Date.now().toString()} />
        <meta name="cache-control" content="no-cache, no-store, must-revalidate" />
        <meta name="pragma" content="no-cache" />
        <meta name="expires" content="0" />
      </head>
      <body className={manrope.className} suppressHydrationWarning={true}>
        <CentralizedAuthProvider>
          <CartProvider>
            <GenerationProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
                {process.env.NODE_ENV === 'development' && <AuthDebugPanel />}
              </TooltipProvider>
            </GenerationProvider>
          </CartProvider>
        </CentralizedAuthProvider>
      </body>
    </html>
  );
}
