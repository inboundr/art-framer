import { NextRequest, NextResponse } from 'next/server';
import { prodigiClient } from '@/lib/prodigi';
import { z } from 'zod';

const FrameImageSchema = z.object({
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver']),
  frameMaterial: z.enum(['wood', 'metal', 'plastic', 'bamboo']),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const validatedData = FrameImageSchema.parse({
      frameSize: searchParams.get('frameSize'),
      frameStyle: searchParams.get('frameStyle'),
      frameMaterial: searchParams.get('frameMaterial'),
    });

    // Get the Prodigi SKU for this frame combination
    const sku = prodigiClient.getProductSku(
      validatedData.frameSize,
      validatedData.frameStyle,
      validatedData.frameMaterial
    );

    try {
      // Check if Prodigi API key is configured
      const prodigiApiKey = process.env.PRODIGI_API_KEY;
      if (!prodigiApiKey || prodigiApiKey === 'your_prodigi_api_key_here' || prodigiApiKey === 'your-prodigi-api-key-here') {
        console.warn('⚠️ Prodigi API key not configured, using fallback data');
        throw new Error('Prodigi API key not configured');
      }

      // Fetch product details from Prodigi
      console.log(`🔍 Fetching Prodigi product details for SKU: ${sku}`);
      const productDetails = await prodigiClient.getProductDetails(sku);
      
      console.log(`✅ Successfully fetched Prodigi product details:`, {
        sku: productDetails.sku,
        name: productDetails.name,
        price: productDetails.price
      });
      
      return NextResponse.json({
        success: true,
        frame: {
          sku,
          name: productDetails.name,
          description: productDetails.description,
          price: productDetails.price,
          dimensions: productDetails.dimensions,
          images: productDetails.images || [],
        }
      });
    } catch (prodigiError) {
      console.error('❌ Error fetching frame details from Prodigi:', prodigiError);
      
      // Enhanced error logging for debugging
      if (prodigiError instanceof Error) {
        console.error('Prodigi error details:', {
          message: prodigiError.message,
          stack: prodigiError.stack,
          apiKey: process.env.PRODIGI_API_KEY ? 'Present' : 'Missing',
          environment: process.env.PRODIGI_ENVIRONMENT || 'Not set'
        });
      }
      
      // Fallback to mock frame data with placeholder images
      console.log('🔄 Using fallback mock data for frame details');
      return NextResponse.json({
        success: true,
        frame: {
          sku,
          name: `${validatedData.frameSize} ${validatedData.frameStyle} ${validatedData.frameMaterial} frame`,
          description: `A beautiful ${validatedData.frameMaterial} frame in ${validatedData.frameStyle} finish`,
          price: getMockPrice(validatedData.frameSize, validatedData.frameStyle, validatedData.frameMaterial),
          dimensions: getMockDimensions(validatedData.frameSize),
          images: [
            {
              url: getMockFrameImageUrl(validatedData.frameStyle, validatedData.frameMaterial),
              type: 'preview' as const,
              width: 400,
              height: 500,
            }
          ],
        },
        fallback: true, // Indicate this is fallback data
        error: prodigiError instanceof Error ? prodigiError.message : 'Unknown Prodigi error'
      });
    }
  } catch (error) {
    console.error('Error in frame images API:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid frame parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch frame images' },
      { status: 500 }
    );
  }
}

// Helper functions for mock data
function getMockPrice(size: string, style: string, material: string): number {
  const basePrices = {
    small: 29.99,
    medium: 39.99,
    large: 59.99,
    extra_large: 89.99,
  };
  
  const styleMultipliers = {
    black: 1.0,
    white: 1.0,
    natural: 1.1,
    gold: 1.3,
    silver: 1.2,
  };
  
  const materialMultipliers = {
    wood: 1.0,
    metal: 1.2,
    plastic: 0.8,
    bamboo: 1.1,
  };
  
  return Math.round((basePrices[size as keyof typeof basePrices] * 
    styleMultipliers[style as keyof typeof styleMultipliers] * 
    materialMultipliers[material as keyof typeof materialMultipliers]) * 100) / 100;
}

function getMockDimensions(size: string) {
  const dimensions = {
    small: { width: 20, height: 25, depth: 2 },
    medium: { width: 30, height: 40, depth: 2 },
    large: { width: 40, height: 50, depth: 3 },
    extra_large: { width: 50, height: 70, depth: 3 },
  };
  
  return dimensions[size as keyof typeof dimensions];
}

function getMockFrameImageUrl(style: string, material: string): string {
  // Use placeholder images or create a URL that represents the frame style
  const styleColors = {
    black: '#1a1a1a',
    white: '#ffffff',
    natural: '#8B4513',
    gold: '#FFD700',
    silver: '#C0C0C0',
  };
  
  const materialTextures = {
    wood: 'wood',
    metal: 'metal',
    plastic: 'plastic',
    bamboo: 'bamboo',
  };
  
  // For now, return a placeholder service URL that can generate frame images
  // In a real implementation, you might use a service like Unsplash or create your own frame images
  const color = encodeURIComponent(styleColors[style as keyof typeof styleColors]);
  const texture = materialTextures[material as keyof typeof materialTextures];
  
  return `https://via.placeholder.com/400x500/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(`${texture} frame`)}`;
}
