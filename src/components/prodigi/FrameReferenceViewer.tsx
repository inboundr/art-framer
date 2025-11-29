/**
 * FrameReferenceViewer Component
 * Shows frame reference images (chevron, corner, cross-section)
 */

'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { 
  getChevronImage, 
  getCornerImages, 
  getCrossSectionImage 
} from '@/lib/prodigi-assets/asset-catalog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface FrameReferenceViewerProps {
  frameType: string;
  color: string;
  views?: ('chevron' | 'corner' | 'cross-section')[];
  className?: string;
}

/**
 * FrameReferenceViewer - Shows frame reference images
 */
export function FrameReferenceViewer({
  frameType,
  color,
  views = ['chevron', 'corner', 'cross-section'],
  className = '',
}: FrameReferenceViewerProps) {
  const chevronImage = useMemo(
    () => getChevronImage(frameType, color),
    [frameType, color]
  );

  const cornerImages = useMemo(
    () => getCornerImages(frameType, color),
    [frameType, color]
  );

  const crossSectionImage = useMemo(
    () => getCrossSectionImage(frameType),
    [frameType]
  );

  const hasAnyView = chevronImage || cornerImages.length > 0 || crossSectionImage;

  if (!hasAnyView) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Frame Reference</CardTitle>
        <CardDescription>
          {frameType} frame in {color}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={views[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {views.includes('chevron') && chevronImage && (
              <TabsTrigger value="chevron">Profile</TabsTrigger>
            )}
            {views.includes('corner') && cornerImages.length > 0 && (
              <TabsTrigger value="corner">Corner</TabsTrigger>
            )}
            {views.includes('cross-section') && crossSectionImage && (
              <TabsTrigger value="cross-section">Cross-Section</TabsTrigger>
            )}
          </TabsList>

          {views.includes('chevron') && chevronImage && (
            <TabsContent value="chevron" className="mt-4">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                <Image
                  src={chevronImage}
                  alt={`${frameType} ${color} frame profile`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            </TabsContent>
          )}

          {views.includes('corner') && cornerImages.length > 0 && (
            <TabsContent value="corner" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cornerImages.map((imagePath, index) => (
                  <div
                    key={index}
                    className="relative aspect-square w-full rounded-lg overflow-hidden"
                  >
                    <Image
                      src={imagePath}
                      alt={`${frameType} ${color} frame corner ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {views.includes('cross-section') && crossSectionImage && (
            <TabsContent value="cross-section" className="mt-4">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                <Image
                  src={crossSectionImage}
                  alt={`${frameType} frame cross-section`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}



