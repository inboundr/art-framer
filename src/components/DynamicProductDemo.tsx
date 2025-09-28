'use client';

import React, { useState } from 'react';
import { useProdigiProducts } from '@/hooks/useProdigiProducts';
import { ProdigiProduct } from '@/lib/prodigi-product-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, RefreshCw, Package, DollarSign, Globe } from 'lucide-react';

export function DynamicProductDemo() {
  const { products, loading, error, fallback, getAllProducts, searchProducts, clearCache } = useProdigiProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('');

  const handleSearch = () => {
    searchProducts({
      category: selectedCategory || undefined,
      size: selectedSize || undefined,
      material: selectedMaterial || undefined,
      finish: selectedFinish || undefined,
    });
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedSize('');
    setSelectedMaterial('');
    setSelectedFinish('');
    setSearchTerm('');
    getAllProducts();
  };

  const filteredProducts = products.filter(product =>
    searchTerm === '' || 
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Extract unique values for filters
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const uniqueSizes = [...new Set(products.map(p => p.attributes?.size).filter(Boolean))];
  const uniqueMaterials = [...new Set(products.map(p => p.attributes?.material).filter(Boolean))];
  const uniqueFinishes = [...new Set(products.map(p => p.attributes?.finish).filter(Boolean))];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Dynamic Product System Demo
          </CardTitle>
          <p className="text-gray-600">
            This demo showcases the dynamic product fetching system that replaces hardcoded product mappings.
          </p>
          {fallback && (
            <Badge variant="outline" className="w-fit">
              Using Fallback Data
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lg:col-span-2"
            />
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger>
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sizes</SelectItem>
                {uniqueSizes.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger>
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Materials</SelectItem>
                {uniqueMaterials.map(material => (
                  <SelectItem key={material} value={material}>{material}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedFinish} onValueChange={setSelectedFinish}>
              <SelectTrigger>
                <SelectValue placeholder="Finish" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Finishes</SelectItem>
                {uniqueFinishes.map(finish => (
                  <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Search Products
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button variant="outline" onClick={getAllProducts} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
            <Button variant="outline" onClick={clearCache} disabled={loading}>
              Clear Cache
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Products: {filteredProducts.length}</span>
            <span>Total: {products.length}</span>
            {loading && <span className="flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</span>}
            {error && <span className="text-red-600">Error: {error}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.sku} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{product.name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="secondary">{product.sku}</Badge>
                {product.category && <Badge variant="outline">{product.category}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.description && (
                <p className="text-sm text-gray-600">{product.description}</p>
              )}
              
              {product.price && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">
                    {product.price.amount} {product.price.currency}
                  </span>
                </div>
              )}

              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Attributes:</h4>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.shipsTo && product.shipsTo.length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Ships to {product.shipsTo.length} countries
                  </span>
                </div>
              )}

              {product.images && product.images.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Images:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {product.images.slice(0, 2).map((image, index) => (
                      <img
                        key={index}
                        src={image.url}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Products Found</h3>
            <p className="text-gray-500">
              {products.length === 0 
                ? "No products available. This might be because the Prodigi API key is not configured or the API is unavailable."
                : "No products match your current search criteria. Try adjusting your filters."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
