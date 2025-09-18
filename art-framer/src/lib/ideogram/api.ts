export interface IdeogramImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: '1x1' | '16x9' | '9x16' | '4x3' | '3x4' | '3x2' | '2x3' | '1x3' | '3x1' | '10x16' | '16x10' | '1x2' | '2x1' | '4x5' | '5x4'; // Updated to match v3 API format
  width?: number;
  height?: number;
  model?: 'V_1' | 'V_1_TURBO' | 'V_2' | 'V_2_TURBO' | 'V_2A' | 'V_2A_TURBO' | 'V_3';
  num_images?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // Correct parameter name and extended range
  rendering_speed?: 'TURBO' | 'DEFAULT' | 'QUALITY'; // Updated to match v3 API exact values
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION'; // Updated to match v3 API
  color_palette?: object; // Updated to match v3 API (was color)
  character_reference_images?: string[]; // Updated to match v3 API
  magic_prompt?: 'AUTO' | 'ON' | 'OFF'; // Added magic_prompt parameter
  seed?: number;
  // Removed deprecated parameters
}

export interface IdeogramImageGenerationResponse {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  prompt: string;
  negative_prompt?: string;
  aspect_ratio: string;
  width: number;
  height: number;
  model: string;
  number_of_images: number;
  render_speed: string;
  magic_prompt: string;
  style: string;
  color: string;
  character?: string;
  reference_image?: string;
  seed?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
  created_at: string;
  updated_at: string;
  images?: IdeogramImage[];
  error?: string;
}

export interface IdeogramImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  width: number;
  height: number;
  seed: number;
  prompt: string;
  negative_prompt?: string;
  metadata: any;
}

export interface IdeogramGalleryResponse {
  images: IdeogramGalleryImage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface IdeogramGalleryImage {
  id: string;
  prompt: string;
  negative_prompt?: string;
  aspect_ratio: string;
  width: number;
  height: number;
  model: string;
  url: string;
  thumbnail_url: string;
  likes: number;
  user?: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
  tags: string[];
  style?: string;
  color?: string;
}

export interface IdeogramUserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    instagram?: string;
    behance?: string;
    dribbble?: string;
  };
  stats: {
    total_images: number;
    total_likes: number;
    followers: number;
    following: number;
  };
  created_at: string;
}

export interface IdeogramUserImagesResponse {
  images: IdeogramGalleryImage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface IdeogramLikeResponse {
  success: boolean;
  likes: number;
  is_liked: boolean;
}

export interface IdeogramComment {
  id: string;
  text: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface IdeogramCommentsResponse {
  comments: IdeogramComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface IdeogramSearchResponse {
  images: IdeogramGalleryImage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  filters: {
    aspect_ratios: string[];
    models: string[];
    styles: string[];
    colors: string[];
    date_ranges: string[];
  };
}

export interface IdeogramTrendingResponse {
  trending: IdeogramGalleryImage[];
  popular: IdeogramGalleryImage[];
  recent: IdeogramGalleryImage[];
}

export interface IdeogramCollection {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  is_public: boolean;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  images: IdeogramGalleryImage[];
  stats: {
    total_images: number;
    total_likes: number;
    followers: number;
  };
  created_at: string;
  updated_at: string;
}

export interface IdeogramCollectionsResponse {
  collections: IdeogramCollection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

class IdeogramAPI {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    // Use our local API proxy to avoid CORS issues
    this.baseURL = '/api/ideogram';
    this.apiKey = process.env.IDEOGRAM_API_KEY || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Prepare headers
    const headers: any = {
      'Api-Key': this.apiKey,
      ...options.headers,
    };
    
    // Only add Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ideogram API request failed:', error);
      throw error;
    }
  }

  // Image Generation
  async generateImage(request: IdeogramImageGenerationRequest): Promise<IdeogramImageGenerationResponse> {
    // Create FormData as required by Ideogram API v3
    const formData = new FormData();
    
    // Add required prompt
    formData.append('prompt', request.prompt);
    
    // Add all optional parameters if they're provided
    if (request.aspect_ratio) {
      formData.append('aspect_ratio', request.aspect_ratio);
    }
    
    if (request.num_images) {
      formData.append('num_images', request.num_images.toString());
    }
    
    if (request.rendering_speed) {
      formData.append('rendering_speed', request.rendering_speed);
    }
    
    if (request.style_type) {
      formData.append('style_type', request.style_type);
    }
    
    if (request.magic_prompt) {
      formData.append('magic_prompt', request.magic_prompt);
    }
    
    if (request.negative_prompt) {
      formData.append('negative_prompt', request.negative_prompt);
    }
    
    if (request.seed) {
      formData.append('seed', request.seed.toString());
    }
    
    if (request.color_palette) {
      formData.append('color_palette', JSON.stringify(request.color_palette));
    }
    
    // Handle character reference images
    if (request.character_reference_images && request.character_reference_images.length > 0) {
      // For each reference image, we need to fetch it and add it as a File to FormData
      for (let i = 0; i < request.character_reference_images.length; i++) {
        const imageUrl = request.character_reference_images[i];
        try {
          // Fetch the image
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], `reference_image_${i}.jpg`, { type: 'image/jpeg' });
            formData.append(`character_reference_images`, file);
          } else {
            console.warn(`Failed to fetch reference image ${i}: ${imageUrl}`);
          }
        } catch (error) {
          console.error(`Error fetching reference image ${i}:`, error);
        }
      }
    }
    
    // Log the FormData contents for debugging
    console.log('Sending FormData to Ideogram API with:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`- ${key}: [File] ${value.name} (${value.size} bytes)`);
      } else {
        console.log(`- ${key}: ${value}`);
      }
    }
    
    const response = await this.request<IdeogramImageGenerationResponse>('/v1/ideogram-v3/generate', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let the browser set it for FormData with boundary
    });
    
    console.log('Ideogram API response received:', response);
    console.log('Number of images in response:', response.images ? response.images.length : 'No images array');
    
    return response;
  }

  async getGenerationStatus(generationId: string): Promise<IdeogramImageGenerationResponse> {
    return this.request<IdeogramImageGenerationResponse>(`/generate/${generationId}`);
  }

  async cancelGeneration(generationId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/generate/${generationId}/cancel`, {
      method: 'POST',
    });
  }

  // Gallery and Discovery
  async getGallery(page: number = 1, limit: number = 20): Promise<IdeogramGalleryResponse> {
    return this.request<IdeogramGalleryResponse>(`/gallery?page=${page}&limit=${limit}`);
  }

  async getTrending(): Promise<IdeogramTrendingResponse> {
    return this.request<IdeogramTrendingResponse>('/trending');
  }

  async searchImages(
    query: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      aspect_ratio?: string;
      model?: string;
      style?: string;
      color?: string;
      date_range?: string;
    }
  ): Promise<IdeogramSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    return this.request<IdeogramSearchResponse>(`/search?${params}`);
  }

  // User Management
  async getUserProfile(userId: string): Promise<IdeogramUserProfile> {
    return this.request<IdeogramUserProfile>(`/users/${userId}`);
  }

  async getUserImages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IdeogramUserImagesResponse> {
    return this.request<IdeogramUserImagesResponse>(
      `/users/${userId}/images?page=${page}&limit=${limit}`
    );
  }

  async updateProfile(updates: Partial<IdeogramUserProfile>): Promise<IdeogramUserProfile> {
    return this.request<IdeogramUserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Image Interactions
  async likeImage(imageId: string): Promise<IdeogramLikeResponse> {
    return this.request<IdeogramLikeResponse>(`/images/${imageId}/like`, {
      method: 'POST',
    });
  }

  async unlikeImage(imageId: string): Promise<IdeogramLikeResponse> {
    return this.request<IdeogramLikeResponse>(`/images/${imageId}/unlike`, {
      method: 'POST',
    });
  }

  async getImageComments(
    imageId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<IdeogramCommentsResponse> {
    return this.request<IdeogramCommentsResponse>(
      `/images/${imageId}/comments?page=${page}&limit=${limit}`
    );
  }

  async addComment(imageId: string, text: string): Promise<IdeogramComment> {
    return this.request<IdeogramComment>(`/images/${imageId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Collections
  async getCollections(
    page: number = 1,
    limit: number = 20
  ): Promise<IdeogramCollectionsResponse> {
    return this.request<IdeogramCollectionsResponse>(`/collections?page=${page}&limit=${limit}`);
  }

  async getCollection(collectionId: string): Promise<IdeogramCollection> {
    return this.request<IdeogramCollection>(`/collections/${collectionId}`);
  }

  async createCollection(data: {
    name: string;
    description?: string;
    cover_image?: string;
    is_public: boolean;
  }): Promise<IdeogramCollection> {
    return this.request<IdeogramCollection>('/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCollection(
    collectionId: string,
    updates: Partial<IdeogramCollection>
  ): Promise<IdeogramCollection> {
    return this.request<IdeogramCollection>(`/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCollection(collectionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/collections/${collectionId}`, {
      method: 'DELETE',
    });
  }

  async addImageToCollection(
    collectionId: string,
    imageId: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/collections/${collectionId}/images`, {
      method: 'POST',
      body: JSON.stringify({ image_id: imageId }),
    });
  }

  async removeImageFromCollection(
    collectionId: string,
    imageId: string
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/collections/${collectionId}/images/${imageId}`, {
      method: 'DELETE',
    });
  }

  // Follow/Unfollow
  async followUser(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/v1/users/${userId}/unfollow`, {
      method: 'POST',
    });
  }

  // Analytics and Insights
  async getImageAnalytics(imageId: string): Promise<{
    views: number;
    likes: number;
    shares: number;
    downloads: number;
    engagement_rate: number;
  }> {
    return this.request(`/v1/images/${imageId}/analytics`);
  }

  async getUserAnalytics(): Promise<{
    total_images: number;
    total_likes: number;
    total_views: number;
    total_shares: number;
    average_engagement: number;
    top_performing_images: IdeogramGalleryImage[];
  }> {
    return this.request('/v1/analytics');
  }

  // Model Information
  async getAvailableModels(): Promise<{
    models: Array<{
      id: string;
      name: string;
      description: string;
      capabilities: string[];
      pricing: {
        per_image: number;
        credits_per_image: number;
      };
    }>;
  }> {
    return this.request('/v1/models');
  }

  async getModelCapabilities(modelId: string): Promise<{
    id: string;
    name: string;
    supported_aspect_ratios: string[];
    max_dimensions: {
      width: number;
      height: number;
    };
    features: string[];
    limitations: string[];
  }> {
    return this.request(`/v1/models/${modelId}`);
  }

  // Style and Color Presets
  async getStylePresets(): Promise<{
    styles: Array<{
      id: string;
      name: string;
      description: string;
      preview_image: string;
      tags: string[];
    }>;
  }> {
    return this.request('/v1/styles');
  }

  async getColorPresets(): Promise<{
    colors: Array<{
      id: string;
      name: string;
      description: string;
      hex_values: string[];
      preview_image: string;
    }>;
  }> {
    return this.request('/v1/colors');
  }

  // Batch Operations
  async batchGenerateImages(requests: IdeogramImageGenerationRequest[]): Promise<{
    batch_id: string;
    generations: IdeogramImageGenerationResponse[];
  }> {
    return this.request('/v1/batch-generations', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  async getBatchStatus(batchId: string): Promise<{
    batch_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
    generations: IdeogramImageGenerationResponse[];
  }> {
    return this.request(`/v1/batch-generations/${batchId}`);
  }

  // Webhook Management
  async createWebhook(url: string, events: string[]): Promise<{
    id: string;
    url: string;
    events: string[];
    created_at: string;
  }> {
    return this.request('/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    });
  }

  async deleteWebhook(webhookId: string): Promise<{ success: boolean }> {
    return this.request(`/v1/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const ideogramAPI = new IdeogramAPI();

