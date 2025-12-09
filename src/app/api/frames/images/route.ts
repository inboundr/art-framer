import { NextRequest, NextResponse } from 'next/server';
import { prodigiClient } from '@/lib/prodigi';
import { z } from 'zod';

const FrameImageSchema = z.object({
  frameSize: z.string().regex(/^\d+x\d+$/, 'Frame size must be in format "WIDTHxHEIGHT" (e.g., "8x10", "16x20")'),
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
      
      // Get real-time pricing from Prodigi quotes (product details endpoint doesn't include prices)
      console.log(`💰 Fetching real-time pricing for SKU: ${sku}`);
      // Build attributes using product metadata to satisfy required fields (e.g., mountColor)
      // Prodigi returns attributes as a map of string arrays; cast to a flexible record for safe indexing.
      const validAttributes = (productDetails.attributes || {}) as Record<string, string[]>;
      const normalize = (val: string) => val.trim().toLowerCase();
      const pickValid = (key: string, requested?: string) => {
        const opts: string[] | undefined = validAttributes[key];
        if (!opts || opts.length === 0) return undefined;
        if (requested) {
          const match = opts.find(opt => normalize(opt) === normalize(requested));
          if (match) return match;
        }
        return opts[0]; // fallback to first valid option
      };

      const attributes: Record<string, string> = {};
      const isCanvasProduct = sku.toLowerCase().startsWith('can-') || sku.toLowerCase().includes('canvas');

      // Color
      const requestedColor = validatedData.frameStyle;
      const chosenColor = pickValid('color', requestedColor);
      if (chosenColor) {
        attributes.color = chosenColor.toLowerCase(); // Prodigi quotes expect lowercase
      }

      // Wrap
      const chosenWrap = pickValid('wrap', 'ImageWrap');
      if (chosenWrap) {
        attributes.wrap = chosenWrap.toLowerCase();
      } else if (isCanvasProduct) {
        attributes.wrap = 'imagewrap';
      }

      // Mount + mountColor (required for many framed SKUs)
      const chosenMount = pickValid('mount');
      if (chosenMount) {
        attributes.mount = chosenMount;
      }
      const chosenMountColor = pickValid('mountColor', validatedData.frameStyle);
      if (chosenMountColor) {
        attributes.mountColor = chosenMountColor;
      }

      // Glaze / finish / edge if required — pick first valid to avoid validation errors
      const chosenGlaze = pickValid('glaze');
      if (chosenGlaze) {
        attributes.glaze = chosenGlaze;
      }
      const chosenEdge = pickValid('edge');
      if (chosenEdge) {
        attributes.edge = chosenEdge;
      }
      const chosenFinish = pickValid('finish');
      if (chosenFinish) {
        attributes.finish = chosenFinish;
      }

      console.log(`📦 Building quote with attributes:`, attributes);

      const quotes = await prodigiClient.getFullQuote({
        items: [{
          sku: sku,
          quantity: 1,
          attributes: attributes
        }],
        destinationCountryCode: 'US' // Default to US for base pricing
      });

      if (!quotes || quotes.length === 0) {
        throw new Error('No quotes returned from Prodigi');
      }

      const price = parseFloat(quotes[0].costSummary.items.amount);
      console.log(`✅ Real-time price from Prodigi: $${price} USD`);
      
      console.log(`✅ Successfully fetched Prodigi product details:`, {
        sku: productDetails.sku,
        name: productDetails.name,
        price: price,
        priceSource: 'Prodigi quote'
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
      
      // Prefer failing loudly over serving inaccurate pricing
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch accurate Prodigi pricing',
          details: prodigiError instanceof Error ? prodigiError.message : 'Unknown Prodigi error',
        },
        { status: 502 }
      );
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
  // V2 sizing: Calculate base price from actual size
  let basePrice = 39.99; // Default to medium size price
  
  if (/^\d+x\d+$/.test(size)) {
    // Parse size (e.g., "8x10" -> 8 inches x 10 inches)
    const [widthStr, heightStr] = size.split('x');
    const width = parseInt(widthStr || '16', 10);
    const height = parseInt(heightStr || '20', 10);
    const area = width * height; // Area in square inches
    
    // Price based on area: ~$0.10 per square inch, minimum $29.99
    basePrice = Math.max(29.99, area * 0.10);
  } else {
    // Legacy compatibility: Map old enum values
    const legacyPrices: Record<string, number> = {
      small: 29.99,
      medium: 39.99,
      large: 59.99,
      extra_large: 89.99,
    };
    basePrice = legacyPrices[size] || 39.99;
  }
  
  const styleMultipliers: Record<string, number> = {
    black: 1.0,
    white: 1.0,
    natural: 1.1,
    gold: 1.3,
    silver: 1.2,
    brown: 1.1,
    grey: 1.0,
  };
  
  const materialMultipliers: Record<string, number> = {
    wood: 1.0,
    bamboo: 1.1,
    canvas: 0.9,
    acrylic: 1.15,
  };
  
  return Math.round((basePrice * 
    (styleMultipliers[style] || 1.0) * 
    (materialMultipliers[material] || 1.0)) * 100) / 100;
}

function getMockDimensions(size: string) {
  // V2 sizing: Calculate dimensions from actual size
  if (/^\d+x\d+$/.test(size)) {
    const [widthStr, heightStr] = size.split('x');
    const widthInches = parseInt(widthStr || '16', 10);
    const heightInches = parseInt(heightStr || '20', 10);
    
    // Convert inches to cm (1 inch = 2.54 cm)
    const widthCm = Math.round(widthInches * 2.54);
    const heightCm = Math.round(heightInches * 2.54);
    const depthCm = widthInches > 20 || heightInches > 20 ? 3 : 2;
    
    return { width: widthCm, height: heightCm, depth: depthCm };
  }
  
  // Legacy compatibility: Map old enum values
  const legacyDimensions: Record<string, { width: number; height: number; depth: number }> = {
    small: { width: 20, height: 25, depth: 2 },
    medium: { width: 30, height: 40, depth: 2 },
    large: { width: 40, height: 50, depth: 3 },
    extra_large: { width: 50, height: 70, depth: 3 },
  };
  
  return legacyDimensions[size] || legacyDimensions.medium;
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
