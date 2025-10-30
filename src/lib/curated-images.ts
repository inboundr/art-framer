import { supabase as browserSupabase } from '@/lib/supabase/client';
import { createServiceClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { ensureSupabaseReady } from '@/lib/utils/supabaseReady';

export interface CuratedImage {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  image_url: string;
  thumbnail_url: string | null;
  width: number;
  height: number;
  aspect_ratio: string;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CuratedGalleryResponse {
  images: CuratedImage[];
  pagination: {
    page: number;
    total_pages: number;
    total: number;
    has_more: boolean;
  };
}

export interface CuratedImageFilters {
  category?: string;
  tags?: string[];
  featured_only?: boolean;
  aspect_ratio?: string;
}

export class CuratedImageAPI {
  private getClient() {
    if (typeof window === 'undefined') {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createServiceClient();
      }
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        {
          cookies: {
            getAll() {
              return [];
            },
            setAll() {
              // no-op in API context
            },
          },
        }
      );
    }
    return browserSupabase;
  }

  private resolvePublicUrl(path: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const client = this.getClient();
    const { data } = client.storage.from('curated-images').getPublicUrl(path);
    return data?.publicUrl ?? path;
  }
  // Get curated images for home page gallery
  async getGallery(
    page: number = 1, 
    limit: number = 20, 
    filters?: CuratedImageFilters
  ): Promise<CuratedGalleryResponse> {
    console.log('🔍 CuratedImageAPI.getGallery called with:', { page, limit, filters });
    
    try {
      // Only run readiness check in browser
      if (typeof window !== 'undefined') {
        const isReady = await ensureSupabaseReady();
        if (!isReady) {
          console.warn('❌ Supabase client not ready, returning empty response');
          return {
            images: [],
            pagination: {
              page,
              total_pages: 0,
              total: 0,
              has_more: false
            }
          };
        }
      }

      const offset = (page - 1) * limit;
      
      // Build query
      const client = this.getClient();
      let query = client
        .from('curated_images')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters?.featured_only) {
        query = query.eq('is_featured', true);
      }
      
      if (filters?.aspect_ratio) {
        query = query.eq('aspect_ratio', filters.aspect_ratio);
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Execute query with pagination and timeout
      console.log('🔍 Executing curated images query...');
      console.log('🔍 Supabase client check:', { 
        hasSupabase: !!client, 
        hasFrom: !!client?.from,
        context: typeof window === 'undefined' ? 'server' : 'browser'
      });
      
      const queryPromise = query.range(offset, offset + limit - 1);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Curated images query timeout')), 10000);
      });
      
      console.log('🔍 Starting query race...');
      const { data: images, error, count } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      console.log('🔍 Query completed:', { 
        hasData: !!images, 
        dataLength: images?.length, 
        hasError: !!error, 
        errorMessage: error?.message,
        count 
      });

      if (error) {
        console.error('❌ Curated images query failed:', error);
        throw new Error(`Failed to fetch curated images: ${error.message}`);
      }

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);
      const has_more = page < total_pages;

      console.log('✅ Curated images query successful:', { 
        imageCount: images?.length || 0, 
        total,
        page,
        total_pages 
      });

      const resolvedImages = (images || []).map((img: any) => ({
        ...img,
        image_url: this.resolvePublicUrl(img.image_url),
        thumbnail_url: this.resolvePublicUrl(img.thumbnail_url),
      }));

      return {
        images: resolvedImages,
        pagination: {
          page,
          total_pages,
          total,
          has_more,
        },
      };
    } catch (error) {
      console.error('❌ CuratedImageAPI.getGallery error:', error);
      throw error;
    }
  }

  // Get featured images only
  async getFeaturedImages(limit: number = 12): Promise<CuratedImage[]> {
    console.log('🔍 CuratedImageAPI.getFeaturedImages called with limit:', limit);
    
    try {
      const client = this.getClient();
      // Check if supabase is available
      if (!client || !client.from) {
        console.warn('Supabase client not available, returning empty array');
        return [];
      }

      const { data: images, error } = await client
        .from('curated_images')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Featured images query failed:', error);
        throw new Error(`Failed to fetch featured images: ${error.message}`);
      }

      const resolved = (images || []).map((img: any) => ({
        ...img,
        image_url: this.resolvePublicUrl(img.image_url),
        thumbnail_url: this.resolvePublicUrl(img.thumbnail_url),
      }));

      console.log('✅ Featured images query successful:', { count: resolved.length });
      return resolved;
    } catch (error) {
      console.error('❌ CuratedImageAPI.getFeaturedImages error:', error);
      throw error;
    }
  }

  // Get images by category
  async getImagesByCategory(category: string, limit: number = 20): Promise<CuratedImage[]> {
    console.log('🔍 CuratedImageAPI.getImagesByCategory called with:', { category, limit });
    
    try {
      const client = this.getClient();
      const { data: images, error } = await client
        .from('curated_images')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Category images query failed:', error);
        throw new Error(`Failed to fetch category images: ${error.message}`);
      }

      const resolved = (images || []).map((img: any) => ({
        ...img,
        image_url: this.resolvePublicUrl(img.image_url),
        thumbnail_url: this.resolvePublicUrl(img.thumbnail_url),
      }));

      console.log('✅ Category images query successful:', { count: resolved.length });
      return resolved;
    } catch (error) {
      console.error('❌ CuratedImageAPI.getImagesByCategory error:', error);
      throw error;
    }
  }

  // Get all available categories
  async getCategories(): Promise<string[]> {
    console.log('🔍 CuratedImageAPI.getCategories called');
    
    try {
      const client = this.getClient();
      const { data: categories, error } = await client
        .from('curated_images')
        .select('category')
        .eq('is_active', true)
        .order('category');

      if (error) {
        console.error('❌ Categories query failed:', error);
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      const uniqueCategories = [...new Set(categories?.map((c: any) => c.category) || [])] as string[];
      console.log('✅ Categories query successful:', { count: uniqueCategories.length });
      return uniqueCategories;
    } catch (error) {
      console.error('❌ CuratedImageAPI.getCategories error:', error);
      throw error;
    }
  }

  // Get all available tags
  async getTags(): Promise<string[]> {
    console.log('🔍 CuratedImageAPI.getTags called');
    
    try {
      const client = this.getClient();
      const { data: images, error } = await client
        .from('curated_images')
        .select('tags')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Tags query failed:', error);
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      const allTags = images?.flatMap((img: any) => img.tags || []) || [];
      const uniqueTags = [...new Set(allTags)] as string[];
      console.log('✅ Tags query successful:', { count: uniqueTags.length });
      return uniqueTags;
    } catch (error) {
      console.error('❌ CuratedImageAPI.getTags error:', error);
      throw error;
    }
  }

  // Search images by title, description, or tags
  async searchImages(
    query: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<CuratedGalleryResponse> {
    console.log('🔍 CuratedImageAPI.searchImages called with:', { query, page, limit });
    
    try {
      const offset = (page - 1) * limit;
      const client = this.getClient();

      const { data: images, error, count } = await client
        .from('curated_images')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Search query failed:', error);
        throw new Error(`Failed to search images: ${error.message}`);
      }

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);
      const has_more = page < total_pages;

      console.log('✅ Search query successful:', { 
        imageCount: images?.length || 0, 
        total,
        query 
      });

      const resolvedImages = (images || []).map((img: any) => ({
        ...img,
        image_url: this.resolvePublicUrl(img.image_url),
        thumbnail_url: this.resolvePublicUrl(img.thumbnail_url),
      }));

      return {
        images: resolvedImages,
        pagination: {
          page,
          total_pages,
          total,
          has_more,
        },
      };
    } catch (error) {
      console.error('❌ CuratedImageAPI.searchImages error:', error);
      throw error;
    }
  }
}

export const curatedImageAPI = new CuratedImageAPI();
