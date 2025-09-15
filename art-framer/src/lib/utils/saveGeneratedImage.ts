interface SaveImageParams {
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  model: string;
  style?: string;
  color?: string;
  userId: string;
}

export async function saveGeneratedImageToSupabase(params: SaveImageParams) {
  try {
    console.log('🔄 Calling save-image API:', params);
    
    // Call the server-side API to handle image saving
    const response = await fetch('/api/save-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
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
