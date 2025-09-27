import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
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
      <body className={manrope.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <CartProvider>
            <GenerationProvider>
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
                <AuthDebugPanel />
              </TooltipProvider>
            </GenerationProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
