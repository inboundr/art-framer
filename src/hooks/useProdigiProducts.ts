import { useState, useEffect, useCallback } from 'react';

export interface ProductSearchCriteria {
  category?: string;
  size?: string;
  material?: string;
  finish?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface ProdigiProduct {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  weight: number;
  category: string;
  attributes: {
    size?: string;
    material?: string;
    finish?: string;
  };
  images?: {
    url: string;
    type: 'preview' | 'thumbnail' | 'full';
    width: number;
    height: number;
  }[];
}

export interface UseProdigiProductsReturn {
  products: ProdigiProduct[];
  loading: boolean;
  error: string | null;
  fallback: boolean;
  count: number;
  searchProducts: (criteria: ProductSearchCriteria) => Promise<void>;
  getAllProducts: (category?: string) => Promise<void>;
  getProductDetails: (sku: string) => Promise<ProdigiProduct | null>;
  clearCache: () => void;
}

export function useProdigiProducts(): UseProdigiProductsReturn {
  const [products, setProducts] = useState<ProdigiProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [count, setCount] = useState(0);

  const searchProducts = useCallback(async (criteria: ProductSearchCriteria) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (criteria.category) params.append('category', criteria.category);
      if (criteria.size) params.append('size', criteria.size);
      if (criteria.material) params.append('material', criteria.material);
      if (criteria.finish) params.append('finish', criteria.finish);

      const response = await fetch(`/api/prodigi/products?${params}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setCount(data.count);
        setFallback(data.fallback);
      } else {
        throw new Error(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProducts([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllProducts = useCallback(async (category?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (category) params.append('category', category);

      const response = await fetch(`/api/prodigi/products?${params}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setCount(data.count);
        setFallback(data.fallback);
      } else {
        throw new Error(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProducts([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductDetails = useCallback(async (sku: string): Promise<ProdigiProduct | null> => {
    try {
      const response = await fetch(`/api/prodigi/products/${sku}`);
      const data = await response.json();

      if (data.success) {
        return data.product;
      } else {
        throw new Error(data.error || 'Failed to fetch product details');
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
      return null;
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await fetch('/api/prodigi/products/clear-cache', { method: 'POST' });
      // Refresh current products
      if (products.length > 0) {
        await getAllProducts();
      }
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
  }, [products.length, getAllProducts]);

  return {
    products,
    loading,
    error,
    fallback,
    count,
    searchProducts,
    getAllProducts,
    getProductDetails,
    clearCache,
  };
}
