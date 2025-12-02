import { NextRequest, NextResponse } from 'next/server';
import { prodigiClient } from '@/lib/prodigi';
import { z } from 'zod';

const FrameImageSchema = z.object({
  frameSize: z.enum(['small', 'medium', 'large', 'extra_large']),
  frameStyle: z.enum(['black', 'white', 'natural', 'gold', 'silver', 'brown', 'grey']),
  frameMaterial: z.enum(['wood', 'bamboo', 'canvas', 'acrylic', 'metal', 'plastic']),
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
    const sku = await prodigiClient.generateFrameSku(
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
      
      // Build attributes based on product requirements and user selection
      const attributes: Record<string, string> = {};
      // Prodigi attributes can have various structures, so we use a flexible type
      const validAttributes = (productDetails.attributes || {}) as Record<string, any>;
      
      // Map frameStyle to color attribute if product requires it
      if (validAttributes.color && Array.isArray(validAttributes.color) && validAttributes.color.length > 0) {
        // Find matching color from valid options (case-insensitive)
        const matchingColor = validAttributes.color.find(
          (opt: string) => opt.toLowerCase() === validatedData.frameStyle.toLowerCase()
        );
        if (matchingColor) {
          attributes.color = matchingColor; // Use exact case from Prodigi
        } else {
          // If exact match not found, use first valid option as fallback
          attributes.color = validAttributes.color[0];
          console.warn(`⚠️ Frame style "${validatedData.frameStyle}" not found in valid colors, using default: ${attributes.color}`);
        }
      }
      
      // Get real-time pricing from Prodigi quotes (product details endpoint doesn't include prices)
      console.log(`💰 Fetching real-time pricing for SKU: ${sku} with attributes:`, attributes);
      let price = 0;
      try {
        const quotes = await prodigiClient.getFullQuote({
          items: [{
            sku: sku,
            quantity: 1,
            attributes: attributes
          }],
          destinationCountryCode: 'US' // Default to US for base pricing
        });
        
        if (quotes && quotes.length > 0) {
          price = parseFloat(quotes[0].costSummary.items.amount);
          console.log(`✅ Real-time price from Prodigi: $${price} USD`);
        }
      } catch (priceError) {
        console.warn('⚠️ Failed to fetch real-time price, using fallback:', priceError);
        // Fallback to mock price if quote fails
        price = getMockPrice(validatedData.frameSize, validatedData.frameStyle, validatedData.frameMaterial);
      }
      
      console.log(`✅ Successfully fetched Prodigi product details:`, {
        sku: productDetails.sku,
        name: productDetails.name,
        price: price,
        priceSource: price > 0 ? 'Prodigi quote' : 'Fallback'
      });
      
      return NextResponse.json({
        success: true,
        frame: {
          sku,
          name: productDetails.name,
          description: productDetails.description,
          price: price, // Use real-time price from quote
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
    brown: 1.1,
    grey: 1.0,
  };
  
  const materialMultipliers = {
    wood: 1.0,
    bamboo: 1.1,
    canvas: 0.9,
    acrylic: 1.15,
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
    brown: '#654321',
    grey: '#808080',
  };
  
  const materialTextures = {
    wood: 'wood',
    bamboo: 'bamboo',
    canvas: 'canvas',
    acrylic: 'acrylic',
  };
  
  // For now, return a placeholder service URL that can generate frame images
  // In a real implementation, you might use a service like Unsplash or create your own frame images
  const color = encodeURIComponent(styleColors[style as keyof typeof styleColors]);
  const texture = materialTextures[material as keyof typeof materialTextures];
  
  return `https://via.placeholder.com/400x500/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(`${texture} frame`)}`;
}
