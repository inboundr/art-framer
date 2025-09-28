'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProdigiProducts, ProdigiProduct } from '@/hooks/useProdigiProducts';
import { ShoppingCart, RefreshCw, Filter, X } from 'lucide-react';

interface DynamicProductSelectorProps {
  onProductSelect?: (product: ProdigiProduct) => void;
  onAddToCart?: (product: ProdigiProduct) => void;
  showFilters?: boolean;
  limit?: number;
}

export function DynamicProductSelector({
  onProductSelect,
  onAddToCart,
  showFilters = true,
  limit = 20
}: DynamicProductSelectorProps) {
  const {
    products,
    loading,
    error,
    fallback,
    count,
    searchProducts,
    getAllProducts,
    clearCache
  } = useProdigiProducts();

  const [filters, setFilters] = useState({
    category: '',
    size: '',
    material: '',
    finish: '',
    priceMin: '',
    priceMax: ''
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    // Load initial products
    getAllProducts();
  }, [getAllProducts]);

  const handleSearch = async () => {
    const criteria: any = {};
    
    if (filters.category) criteria.category = filters.category;
    if (filters.size) criteria.size = filters.size;
    if (filters.material) criteria.material = filters.material;
    if (filters.finish) criteria.finish = filters.finish;
    if (filters.priceMin) criteria.priceMin = parseFloat(filters.priceMin);
    if (filters.priceMax) criteria.priceMax = parseFloat(filters.priceMax);

    await searchProducts(criteria);
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      size: '',
      material: '',
      finish: '',
      priceMin: '',
      priceMax: ''
    });
    getAllProducts();
  };

  const handleProductSelect = (product: ProdigiProduct) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const handleAddToCart = (product: ProdigiProduct) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading products...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error loading products: {error}</p>
        <Button onClick={() => getAllProducts()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fallback && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <p className="text-yellow-800 font-medium">Using fallback data</p>
              <p className="text-yellow-700 text-sm">Prodigi API is unavailable. Showing cached/fallback products.</p>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Product Filters
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCache}
                  title="Clear cache and refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="framed">Framed</SelectItem>
                    <SelectItem value="prints">Prints</SelectItem>
                    <SelectItem value="posters">Posters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="size">Size</Label>
                <Select
                  value={filters.size}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Sizes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sizes</SelectItem>
                    <SelectItem value="10x10">10x10</SelectItem>
                    <SelectItem value="16x20">16x20</SelectItem>
                    <SelectItem value="16x24">16x24</SelectItem>
                    <SelectItem value="30x40">30x40</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="material">Material</Label>
                <Select
                  value={filters.material}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, material: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Materials" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Materials</SelectItem>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="wood">Wood</SelectItem>
                    <SelectItem value="metal">Metal</SelectItem>
                    <SelectItem value="paper">Paper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="finish">Finish</Label>
                <Select
                  value={filters.finish}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, finish: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Finishes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Finishes</SelectItem>
                    <SelectItem value="matte">Matte</SelectItem>
                    <SelectItem value="glossy">Glossy</SelectItem>
                    <SelectItem value="satin">Satin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label htmlFor="priceMin">Min Price</Label>
                  <Input
                    id="priceMin"
                    type="number"
                    placeholder="0"
                    value={filters.priceMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="priceMax">Max Price</Label>
                  <Input
                    id="priceMax"
                    type="number"
                    placeholder="1000"
                    value={filters.priceMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSearch}>Search</Button>
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.slice(0, limit).map((product) => (
          <Card key={product.sku} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
              <p className="text-sm text-gray-600">{product.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Price:</span>
                  <span className="text-lg font-bold">${product.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm">{product.attributes.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Material:</span>
                  <span className="text-sm">{product.attributes.material}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Finish:</span>
                  <span className="text-sm">{product.attributes.finish}</span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleProductSelect(product)}
                  className="flex-1"
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAddToCart(product)}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">No products found</p>
          <Button variant="outline" onClick={() => getAllProducts()} className="mt-2">
            Load All Products
          </Button>
        </div>
      )}

      {products.length > limit && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Showing {limit} of {count} products
          </p>
        </div>
      )}
    </div>
  );
}
