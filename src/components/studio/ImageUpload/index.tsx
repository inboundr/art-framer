/**
 * Image Upload Component
 * Handles image upload with drag & drop
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStudioStore } from '@/store/studio';

export function ImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { setImage, setAnalyzing, setImageAnalysis, updateConfig } = useStudioStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // 1. Upload to storage
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { url, id } = await uploadResponse.json();

      // 2. Set image in store
      setImage(url, id);

      // 3. Analyze image
      setAnalyzing(true);

      const analysisResponse = await fetch('/api/studio/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (analysisResponse.ok) {
        const data = await analysisResponse.json();

        // Set analysis
        setImageAnalysis(data.analysis);

        // Apply recommended configuration
        if (data.recommendations?.topProduct) {
          const product = data.recommendations.topProduct;
          updateConfig({
            sku: product.sku,
            frameColor: product.frameColour?.[0] || 'black',
            frameStyle: data.analysis.recommendedFrameStyle || 'classic',
            glaze: data.analysis.recommendedGlazing || 'acrylic',
            mount: data.analysis.mountRecommendation ? '2.4mm' : 'none',
            size: data.recommendations.sizes?.[0]?.size || '16x20',
          });
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      setAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className="w-full max-w-2xl">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragActive
              ? 'border-black bg-gray-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4" />
            <p className="text-lg font-medium text-gray-900">
              Uploading and analyzing...
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will take just a moment
            </p>
          </div>
        ) : isDragActive ? (
          <div className="flex flex-col items-center">
            <div className="text-6xl mb-4">📤</div>
            <p className="text-lg font-medium text-gray-900">
              Drop your image here
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload your artwork
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop an image, or click to browse
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Supports:</span>
              <span className="px-2 py-1 bg-gray-100 rounded">JPG</span>
              <span className="px-2 py-1 bg-gray-100 rounded">PNG</span>
              <span className="px-2 py-1 bg-gray-100 rounded">WEBP</span>
            </div>
            <button className="mt-6 px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* Or Generate with AI */}
      <div className="mt-8 text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-50 text-gray-500">or</span>
          </div>
        </div>

        <button className="mt-6 px-6 py-3 border-2 border-black text-black rounded-lg font-medium hover:bg-black hover:text-white transition-colors">
          ✨ Generate Art with AI
        </button>
      </div>
    </div>
  );
}

