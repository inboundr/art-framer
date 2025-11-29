/**
 * Studio Pricing API
 * 
 * Real-time pricing calculation using Prodigi v2 API
 * NOW WITH FACET VALIDATION - No more invalid combinations!
 */

import { NextRequest, NextResponse } from 'next/server';
import { prodigiSDK } from '@/lib/prodigi-v2';
import { facetService } from '@/lib/prodigi-v2/azure-search/facet-service';
import { estimateDeliveryTime, formatDeliveryEstimate } from '@/lib/prodigi-v2/delivery-estimator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { config: rawConfig, country: requestCountry } = await request.json();

    console.log('[Pricing] Request received:', {
      productType: rawConfig.productType,
      size: rawConfig.size,
      currentSku: rawConfig.sku,
    });

    // Step 0: Clean config - remove attributes not applicable to product type (defense-in-depth)
    const config = { ...rawConfig };
    const productType = config.productType?.toLowerCase();
    
    // Clean up based on product type
    switch (productType) {
      case 'canvas':
        delete config.frameColor;
        delete config.frameStyle;
        delete config.frameThickness;
        config.glaze = 'none';
        config.mount = 'none';
        break;
        
      case 'framed-canvas':
        // Framed canvas: NO glaze or mount
        config.glaze = 'none';
        config.mount = 'none';
        break;
        
      case 'framed-print':
        // Framed print: NO wrap
        delete config.wrap;
        break;
        
      case 'acrylic':
      case 'metal':
      case 'poster':
        // These products: NO frame, glaze, mount, or wrap
        delete config.frameColor;
        delete config.frameStyle;
        delete config.frameThickness;
        delete config.wrap;
        config.glaze = 'none';
        config.mount = 'none';
        break;
    }

    console.log('[Pricing] Cleaned config:', {
      productType: config.productType,
      hasFrameColor: !!config.frameColor,
      hasGlaze: config.glaze,
      hasWrap: config.wrap,
    });

    // Step 1: Validate configuration against available options
    const validation = await facetService.validateConfiguration(
      config.productType,
      config,
      'US'
    );

    if (!validation.valid) {
      console.warn('[Pricing] Invalid configuration:', validation.errors);
      return NextResponse.json({
        error: 'Invalid configuration',
        message: validation.errors.join('; '),
        validationErrors: validation.errors,
      }, { status: 400 });
    }

    // Step 2: Always lookup fresh SKU from Azure Search catalog
    // This ensures we get the right SKU for the current product type + size
    // (The frontend might send a stale SKU from a previous product type)
    let sku: string | null = null;
    
    if (config.productType && config.size) {
      // Use Azure Search catalog to get real Prodigi SKU
      sku = await prodigiSDK.catalog.getSKU(config.productType, config.size, 'US');
      
      if (!sku) {
        const availableSizes = await prodigiSDK.catalog.getAvailableSizes(config.productType, 'US');
        return NextResponse.json({
          error: 'Product not available',
          message: `No ${config.productType} available in size ${config.size}`,
          availableSizes,
        }, { status: 404 });
      }
      
      console.log(`[Pricing] Looked up SKU from Azure catalog: ${sku}`);
    } else {
      // Fallback to config.sku if no productType/size provided
      sku = config.sku || null;
    }

    if (!sku) {
      return NextResponse.json({
        error: 'SKU required',
        message: 'Please provide a SKU or product type and size',
      }, { status: 400 });
    }

    // Step 3: Get product details to determine valid attributes
    const product = await prodigiSDK.products.get(sku);
    if (!product) {
      return NextResponse.json({
        error: 'Product not found',
        message: `SKU ${sku} not found in Prodigi catalog`,
      }, { status: 404 });
    }

    // Step 4: Build attributes based on what the product actually supports
    const attributes = buildProductAttributes(config, product.attributes);
    console.log('[Pricing] Product valid attributes:', Object.keys(product.attributes));
    console.log('[Pricing] Attributes being sent:', attributes);

    // Step 5: Build quote request
    // CRITICAL: Use actual destination country for accurate shipping costs
    // Priority: 1) From request, 2) From config, 3) Default to US
    const country = requestCountry || config.destinationCountry || 'US';
    
    if (!requestCountry && !config.destinationCountry) {
      console.warn('[Pricing] No destination country provided, defaulting to US. This may result in incorrect shipping costs for international customers.');
    }
    
    const quoteRequest = {
      destinationCountryCode: country,
      shippingMethod: 'Standard' as const,
      items: [
        {
          sku,
          copies: 1,
          ...(Object.keys(attributes).length > 0 && { attributes }),
          assets: [
            {
              printArea: 'default',
              // Note: url is only needed for orders, not for quotes
            },
          ],
        },
      ],
    };

    console.log('[Pricing] Requesting quote from Prodigi:', {
      sku,
      attributes,
      country,
    });

    // Step 6: Get real quote from Prodigi
    const quotes = await prodigiSDK.quotes.create(quoteRequest);

    // Step 7: Find standard shipping quote
    const standardQuote = quotes.find(q => q.shipmentMethod === 'Standard');

    if (!standardQuote) {
      throw new Error('No standard shipping quote available');
    }

    // Step 8: Extract pricing information
    const itemsCost = Number(standardQuote.costSummary.items?.amount) || 0;
    const shippingCost = Number(standardQuote.costSummary.shipping?.amount) || 0;
    const totalCost = Number(standardQuote.costSummary.totalCost?.amount) || (itemsCost + shippingCost);
    const currency = standardQuote.costSummary.totalCost?.currency || 'USD';
    const productionCountry = standardQuote.shipments?.[0]?.fulfillmentLocation?.countryCode || 'US';

    // Step 9: Calculate accurate delivery estimate
    const deliveryEstimate = estimateDeliveryTime(
      productionCountry,
      country,
      standardQuote.shipmentMethod
    );
    const deliveryFormatted = formatDeliveryEstimate(deliveryEstimate);

    console.log('[Pricing] Quote received:', {
      sku,
      total: totalCost,
      items: itemsCost,
      shipping: shippingCost,
      currency,
      productionCountry,
      destinationCountry: country,
      deliveryEstimate: deliveryFormatted,
    });

    // Step 10: Return pricing with accurate delivery estimate
    return NextResponse.json({
      success: true,
      sku, // Return the SKU so it can be saved to config
      pricing: {
        total: totalCost,
        subtotal: itemsCost,
        shipping: shippingCost,
        currency,
        productionCountry,
        destinationCountry: country,
        sla: deliveryEstimate.totalDays.max, // Use maximum estimated days for safety
        deliveryEstimate: {
          min: deliveryEstimate.totalDays.min,
          max: deliveryEstimate.totalDays.max,
          formatted: deliveryFormatted,
          note: deliveryEstimate.note,
        },
        estimated: false, // This is a REAL quote from Prodigi
      },
    });
  } catch (error: any) {
    console.error('[Pricing] Error:', error);

    // Log detailed error info
    if (error.validationErrors) {
      console.error('[Pricing] Validation errors:', JSON.stringify(error.validationErrors, null, 2));
    }

    if (error.statusCode === 400 && error.data) {
      console.error('[Pricing] API response:', JSON.stringify(error.data, null, 2));
    }

    // Return error response
    return NextResponse.json({
      error: 'Failed to calculate pricing',
      message: error.message || 'Unknown error',
      details: error.validationErrors || null,
      statusCode: error.statusCode || 500,
    }, {
      status: error.statusCode || 500,
    });
  }
}

/**
 * Build product attributes from config, filtering by what the SKU actually supports
 * @param config - User configuration
 * @param validAttributes - Product's supported attributes from Prodigi API (Record<attributeName, validValues[]>)
 * @returns Filtered attributes that the SKU actually accepts
 */
function buildProductAttributes(
  config: any,
  validAttributes: Record<string, string[]>
): Record<string, string> {
  const attributes: Record<string, string> = {};
  const validKeys = Object.keys(validAttributes);

  // Helper to check if attribute is valid for this product
  const isValidAttribute = (key: string) => validKeys.includes(key);

  // Helper to add attribute if valid and has value
  const addIfValid = (key: string, value: any) => {
    if (!value || value === 'none') return;
    if (isValidAttribute(key)) {
      // Check if the value is in the valid options (case-insensitive)
      const validOptions = validAttributes[key];
      const matchingOption = validOptions.find(
        opt => opt.toLowerCase() === value.toLowerCase()
      );
      if (matchingOption) {
        attributes[key] = matchingOption; // Use exact case from Prodigi
      } else {
        console.warn(`[Attributes] Value "${value}" not valid for ${key}. Valid:`, validOptions);
      }
    }
  };

  // Map config fields to Prodigi attribute names
  addIfValid('color', config.frameColor); // Frame color
  addIfValid('wrap', config.wrap); // Canvas wrap  
  addIfValid('glaze', config.glaze === 'acrylic' ? 'Acrylic / Perspex' : config.glaze); // Glaze
  
  // Handle mount attributes
  // IMPORTANT: Some products only support "No mount / Mat" and don't support mount sizes
  // If user wants a mount but product only supports "No mount / Mat", we should inform them
  // but still allow the request to proceed (the mount won't be applied)
  if (config.mount && config.mount !== 'none') {
    if (isValidAttribute('mount')) {
      const validMounts = validAttributes['mount'];
      const mountValue = config.mount;
      
      // Try to find a match in Prodigi's valid options
      // First try exact match (case-insensitive)
      let matchedMount = validMounts.find(
        opt => opt.toLowerCase() === mountValue.toLowerCase()
      );
      
      // If no exact match, try to find mount that contains our value (e.g., "2.0mm" in "2.0mm Mount")
      if (!matchedMount && mountValue.includes('mm')) {
        matchedMount = validMounts.find(
          opt => opt.toLowerCase().includes(mountValue.toLowerCase())
        );
      }
      
      // If we found a match, use it
      if (matchedMount) {
        attributes['mount'] = matchedMount;
        addIfValid('mountColor', config.mountColor);
      } else {
        // Product doesn't support this mount size
        // Check if product only supports "No mount / Mat"
        const onlyNoMount = validMounts.length === 1 && 
          (validMounts[0].toLowerCase().includes('no mount') || 
           validMounts[0].toLowerCase().includes('no-mount'));
        
        if (onlyNoMount) {
          console.warn(`[Attributes] Product only supports "${validMounts[0]}" for mount, but user requested "${mountValue}". Mount will not be applied.`);
          // Don't set mount attribute - product doesn't support it
        } else {
          console.warn(`[Attributes] Mount value "${mountValue}" not valid for this product. Valid options:`, validMounts);
          // Don't set mount attribute - invalid value
        }
      }
    }
  }
  
  // Check if mount is required but not set (either config.mount was invalid or not provided)
    // This handles SKUs that have built-in mounts (e.g., 'mount1' in the SKU name)
  if (!attributes['mount'] && isValidAttribute('mount') && validAttributes['mount'] && validAttributes['mount'].length > 0) {
    // Product requires a mount but none was set (or invalid value was provided)
    const defaultMount = validAttributes['mount'][0];
    console.log(`[Attributes] Product has mount attribute but mount is not set. Using default: ${defaultMount}`);
    attributes['mount'] = defaultMount;
  }
  
  // ALWAYS check if mountColor is required when mount is present
  // This is critical - Prodigi requires mountColor when mount is set
  if (attributes['mount'] && !attributes['mountColor']) {
    if (isValidAttribute('mountColor') && validAttributes['mountColor'] && validAttributes['mountColor'].length > 0) {
      const defaultMountColor = validAttributes['mountColor'][0];
      console.log(`[Attributes] Mount is set but mountColor is missing. Using default: ${defaultMountColor}`);
      attributes['mountColor'] = defaultMountColor;
    } else {
      console.warn(`[Attributes] Mount is set but mountColor is not a valid attribute for this product. Valid attributes:`, validKeys);
    }
  }
  
  addIfValid('paperType', config.paperType); // Paper type
  addIfValid('finish', config.finish); // Finish
  addIfValid('edge', config.edge); // Canvas edge
  addIfValid('frame', config.frameStyle); // Frame style

  // Check if color is required but not set (either config.frameColor was invalid or not provided)
  // This handles cases where user selects an invalid color (e.g., "Gold" when only "black", "white", etc. are valid)
  if (!attributes['color'] && isValidAttribute('color') && validAttributes['color'] && validAttributes['color'].length > 0) {
    // Product requires a color but none was set (or invalid value was provided)
    const defaultColor = validAttributes['color'][0];
    console.log(`[Attributes] Product has color attribute but color is not set. Using default: ${defaultColor}`);
    attributes['color'] = defaultColor;
  }

  // IMPORTANT: Prodigi's API has inconsistent casing for wrap values
  // /products returns capitalized (Black, White, ImageWrap, MirrorWrap)
  // but /quotes expects lowercase (black, white, imagewrap, mirrorwrap)
  // Force lowercase to avoid validation errors
  if (attributes.wrap) {
    attributes.wrap = attributes.wrap.toLowerCase();
  }

  console.log('[Attributes] Built:', {
    validKeys,
    output: attributes,
  });

  return attributes;
}
