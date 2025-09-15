import { supabase } from './client';
import { Database } from './client';

export type Image = Database['public']['Tables']['images']['Row'];
export type ImageInsert = Database['public']['Tables']['images']['Insert'];
export type ImageUpdate = Database['public']['Tables']['images']['Update'];

export interface GalleryResponse {
  images: Image[];
  pagination: {
    page: number;
    total_pages: number;
    total: number;
    has_more: boolean;
  };
}

export interface SearchFilters {
  aspect_ratio?: string;
  model?: string;
  style?: string;
  color?: string;
  date_range?: string;
}

export class SupabaseImageAPI {
  // Get public images for gallery
  async getGallery(page: number = 1, limit: number = 20): Promise<GalleryResponse> {
    console.log('🔍 SupabaseImageAPI.getGallery called with page:', page, 'limit:', limit);
    const offset = (page - 1) * limit;
    
    // Get total count
    const { count } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true);

    // Get images for current page
    const { data: images, error } = await supabase
      .from('images')
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        ),
        image_likes (
          user_id
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch gallery: ${error.message}`);
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    const has_more = page < total_pages;

    return {
      images: images || [],
      pagination: {
        page,
        total_pages,
        total,
        has_more,
      },
    };
  }

  // Search images
  async searchImages(
    query: string,
    page: number = 1,
    limit: number = 20,
    filters?: SearchFilters
  ): Promise<GalleryResponse> {
    const offset = (page - 1) * limit;
    
    let queryBuilder = supabase
      .from('images')
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        ),
        image_likes (
          user_id
        )
      `)
      .eq('is_public', true)
      .ilike('prompt', `%${query}%`);

    // Apply filters
    if (filters?.aspect_ratio) {
      queryBuilder = queryBuilder.eq('aspect_ratio', filters.aspect_ratio);
    }
    if (filters?.model) {
      queryBuilder = queryBuilder.eq('model', filters.model);
    }
    if (filters?.style) {
      queryBuilder = queryBuilder.eq('style', filters.style);
    }
    if (filters?.color) {
      queryBuilder = queryBuilder.eq('color', filters.color);
    }

    // Get total count
    const { count } = await queryBuilder.select('*', { count: 'exact', head: true });

    // Get images for current page
    const { data: images, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to search images: ${error.message}`);
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    const has_more = page < total_pages;

    return {
      images: images || [],
      pagination: {
        page,
        total_pages,
        total,
        has_more,
      },
    };
  }

  // Get trending images (most liked in recent time)
  async getTrending(limit: number = 20): Promise<Image[]> {
    const { data: images, error } = await supabase
      .from('images')
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        ),
        image_likes (
          user_id
        )
      `)
      .eq('is_public', true)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('likes', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch trending images: ${error.message}`);
    }

    return images || [];
  }

  // Like/unlike an image
  async likeImage(imageId: string, userId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('image_likes')
      .insert({
        image_id: imageId,
        user_id: userId,
      });

    if (error) {
      throw new Error(`Failed to like image: ${error.message}`);
    }

    return { success: true };
  }

  async unlikeImage(imageId: string, userId: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('image_likes')
      .delete()
      .eq('image_id', imageId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to unlike image: ${error.message}`);
    }

    return { success: true };
  }

  // Check if user liked an image
  async isImageLiked(imageId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('image_likes')
      .select('id')
      .eq('image_id', imageId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check like status: ${error.message}`);
    }

    return !!data;
  }

  // Upload image to storage and save metadata to database
  async uploadImage(
    file: File,
    metadata: {
      prompt: string;
      aspect_ratio: string;
      model: string;
      style?: string;
      color?: string;
      userId: string;
    }
  ): Promise<Image> {
    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL from Supabase Storage
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    // Save metadata to database
    const { data: image, error: dbError } = await supabase
      .from('images')
      .insert({
        user_id: metadata.userId,
        prompt: metadata.prompt,
        aspect_ratio: metadata.aspect_ratio,
        model: metadata.model,
        style: metadata.style,
        color: metadata.color,
        image_url: publicUrl,
        status: 'completed',
        is_public: true,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('images').remove([fileName]);
      throw new Error(`Failed to save image metadata: ${dbError.message}`);
    }

    return image;
  }

  // Delete image from storage and database
  async deleteImage(imageId: string, userId: string): Promise<{ success: boolean }> {
    // Get image info first
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('image_url, user_id')
      .eq('id', imageId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch image: ${fetchError.message}`);
    }

    if (image.user_id !== userId) {
      throw new Error('Unauthorized to delete this image');
    }

    // Extract filename from URL
    const urlParts = image.image_url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('images')
      .remove([fileName]);

    if (storageError) {
      throw new Error(`Failed to delete from storage: ${storageError.message}`);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      throw new Error(`Failed to delete from database: ${dbError.message}`);
    }

    return { success: true };
  }

  // Get user's images
  async getUserImages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<GalleryResponse> {
    const offset = (page - 1) * limit;
    
    // Get total count
    const { count } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get images for current page
    const { data: images, error } = await supabase
      .from('images')
      .select(`
        *,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        ),
        image_likes (
          user_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch user images: ${error.message}`);
    }

    const total = count || 0;
    const total_pages = Math.ceil(total / limit);
    const has_more = page < total_pages;

    return {
      images: images || [],
      pagination: {
        page,
        total_pages,
        total,
        has_more,
      },
    };
  }
}

export const supabaseImageAPI = new SupabaseImageAPI();
