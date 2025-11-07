interface SaveImageParams {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  model: string;
  style?: string;
  color?: string;
  userId: string;
  accessToken?: string; // Optional JWT token
}

export async function saveGeneratedImageToSupabase(params: SaveImageParams) {
  try {
    console.log('🔄 Calling save-image API:', { ...params, accessToken: params.accessToken ? 'present' : 'missing' });
    
    // Prepare headers with JWT token if available
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (params.accessToken) {
      headers['Authorization'] = `Bearer ${params.accessToken}`;
    }
    
    // Call the server-side API to handle image saving
    const response = await fetch('/api/save-image', {
      method: 'POST',
      headers,
      credentials: 'include', // Include cookies as fallback
      body: JSON.stringify({
        imageUrl: params.imageUrl,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        model: params.model,
        style: params.style,
        color: params.color,
        userId: params.userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Image saved via API:', result);
    
    return result.image;
  } catch (error) {
    console.error('❌ Error saving image via API:', error);
    throw error;
  }
}
