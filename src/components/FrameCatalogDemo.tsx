'use client';

import React from 'react';
import { useProdigiFrameCatalog, useFrameCatalogStats } from '@/hooks/useProdigiFrameCatalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

/**
 * Demo component showing how to use the Prodigi Frame Catalog
 * This demonstrates fetching and displaying dynamic frame options
 */
export function FrameCatalogDemo() {
  const {
    options,
    colors,
    combinations,
    loading,
    error,
    stats,
    refetch,
    clearCache,
    getAvailableSizes,
    isAvailable
  } = useProdigiFrameCatalog();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading Prodigi catalog...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline" className="text-red-600 border-red-300">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Prodigi Frame Catalog Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-primary">{stats?.totalProducts || 0}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{stats?.frameColors || 0}</div>
              <div className="text-sm text-gray-600">Frame Colors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{stats?.sizes || 0}</div>
              <div className="text-sm text-gray-600">Sizes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{stats?.combinations || 0}</div>
              <div className="text-sm text-gray-600">Combinations</div>
            </div>
          </div>

          {stats?.priceRange && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Price Range</div>
              <div className="text-lg font-semibold">
                ${stats.priceRange.min.toFixed(2)} - ${stats.priceRange.max.toFixed(2)}
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={clearCache} variant="outline" size="sm">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Available Frame Colors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {colors.map(color => {
              const sizes = getAvailableSizes(color);
              return (
                <div key={color} className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: getColorHex(color) }}
                    />
                    <span className="font-medium capitalize">{color}</span>
                  </div>
                  <Badge variant="secondary">{sizes.length} sizes</Badge>
                  <div className="mt-2 text-xs text-gray-600">
                    {sizes.slice(0, 3).join(', ')}
                    {sizes.length > 3 && '...'}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Combination Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Color-Size Combination Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Color</th>
                  {['small', 'medium', 'large', 'extra_large'].map(size => (
                    <th key={size} className="p-2 text-center font-medium capitalize">
                      {size.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colors.map(color => (
                  <tr key={color} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium capitalize">{color}</td>
                    {['small', 'medium', 'large', 'extra_large'].map(size => (
                      <td key={size} className="p-2 text-center">
                        {isAvailable(color, size) ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Product List (first 10) */}
      <Card>
        <CardHeader>
          <CardTitle>Frame Products (Showing first 10 of {options.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {options.slice(0, 10).map(option => (
              <div
                key={option.sku}
                className="flex items-center justify-between p-3 border rounded-lg hover:border-primary transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{option.sku}</div>
                  <div className="text-sm text-gray-600">
                    {option.style.charAt(0).toUpperCase() + option.style.slice(1)} • {' '}
                    {option.sizeLabel} • {' '}
                    {option.dimensions.width}x{option.dimensions.height}{option.dimensions.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">
                    ${option.price.toFixed(2)}
                  </div>
                  <Badge variant={option.available ? 'default' : 'secondary'} className="text-xs">
                    {option.available ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Helper function to get hex color from color name
 */
function getColorHex(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    'black': '#1a1a1a',
    'white': '#ffffff',
    'natural': '#8B4513',
    'oak': '#C19A6B',
    'walnut': '#5C4033',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
  };
  return colorMap[colorName.toLowerCase()] || '#808080';
}

/**
 * Simplified stats display component
 */
export function FrameCatalogStats() {
  const { stats, loading, error } = useFrameCatalogStats();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading stats...
      </div>
    );
  }

  if (error || !stats) {
    return <div className="text-sm text-red-600">Failed to load stats</div>;
  }

  return (
    <div className="flex gap-4 text-sm">
      <div>
        <span className="text-gray-600">Products:</span>
        <span className="ml-1 font-semibold">{stats.totalProducts}</span>
      </div>
      <div>
        <span className="text-gray-600">Colors:</span>
        <span className="ml-1 font-semibold">{stats.frameColors}</span>
      </div>
      <div>
        <span className="text-gray-600">Sizes:</span>
        <span className="ml-1 font-semibold">{stats.sizes}</span>
      </div>
    </div>
  );
}

