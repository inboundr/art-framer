/**
 * Unboxing Video Component
 * Shows unboxing experience video from Supabase storage
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function UnboxingVideo() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideoUrl() {
      try {
        
        // Get the public URL for the unboxing video
        // Assuming the video is stored in a bucket called 'videos' with path 'unboxing/main.mp4'
        const { data } = supabase.storage
          .from('videos')
          .getPublicUrl('unboxing/main.mp4');

        if (data?.publicUrl) {
          setVideoUrl(data.publicUrl);
        } else {
          setError('Video not found');
        }
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideoUrl();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Unboxing Experience
          </h3>
          <p className="text-gray-600 mb-4">
            {error || 'Video will be available soon'}
          </p>
          <p className="text-sm text-gray-500">
            See how customers receive and unpack their framed artwork
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {/* Info Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3 max-w-xs">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">What to Expect</h3>
        <p className="text-xs text-gray-600">
          Watch how your framed artwork will arrive and how to unbox it safely
        </p>
      </div>

      {/* Video Player */}
      <video
        src={videoUrl}
        controls
        controlsList="nodownload"
        className="max-w-full max-h-full object-contain"
        playsInline
        preload="metadata"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

