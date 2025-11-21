/**
 * Studio Layout
 * Isolated layout for AI Studio (doesn't inherit from main app layout)
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Art Framer Studio | AI-Powered Frame Customization',
  description: 'Create the perfect custom frame with AI assistance',
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Don't render html/body here - let the root layout handle it
  return <>{children}</>;
}

