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
import { detectUserLocation } from '@/lib/location-detection';
import { currencyService } from '@/lib/currency';
import { getCountry } from '@/lib/countries';
import { getUserFriendlyError } from '@/lib/error-handling/user-friendly-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let rawConfig: any = null;
  let country: string = 'US';
  
  try {
    const requestData = await request.json();
    rawConfig = requestData.config;
    const requestCountry = requestData.country;
    
    // Detect country with priority: requestCountry > config.destinationCountry > IP > default
    const location = await detectUserLocation(request, requestCountry || rawConfig?.destinationCountry);
    country = location.country;
    
    console.log('[Pricing] Location detected:', {
      country,
      confidence: location.confidence,
      source: location.source,
    });

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
        // Glaze and mount availability depends on the specific product, but we'll let validation handle it
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

    // Step 1: Get available options first to clean config properly
    const availableOptions = await facetService.getAvailableOptions(
      config.productType,
      country
    );
    
    // Step 1.5: Clean config based on available options (auto-fix invalid attributes)
    if (!availableOptions.hasGlaze && config.glaze && config.glaze !== 'none') {
      console.log('[Pricing] Removing glaze (not available for this product type)');
      config.glaze = 'none';
    }
    if (!availableOptions.hasMount && config.mount && config.mount !== 'none') {
      console.log('[Pricing] Removing mount (not available for this product type)');
      config.mount = 'none';
    }
    if (!availableOptions.hasWrap && config.wrap) {
      console.log('[Pricing] Removing wrap (not available for this product type)');
      delete config.wrap;
    }
    
    // Step 2: Validate configuration against available options (use detected country)
    const validation = await facetService.validateConfiguration(
      config.productType,
      config,
      country // ✅ Use detected country for validation
    );

    if (!validation.valid) {
      console.warn('[Pricing] Invalid configuration:', validation.errors);
      
      return NextResponse.json({
        error: 'Invalid configuration',
        message: validation.errors.join('; '),
        validationErrors: validation.errors,
        availableOptions, // ✅ Return available options to help user
      }, { status: 400 });
    }

    // Step 3: Always lookup fresh SKU from Azure Search catalog
    // This ensures we get the right SKU for the current product type + size
    // (The frontend might send a stale SKU from a previous product type)
    let sku: string | null = null;
    
    if (config.productType && config.size) {
      // Use Azure Search catalog to get real Prodigi SKU (with production country optimization)
      sku = await prodigiSDK.catalog.getSKU(config.productType, config.size, country);
      
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
    // Use the unified attribute builder which handles all required attributes
    const { buildProdigiAttributes } = await import('@/lib/checkout/utils/attribute-builder');
    const attributes = buildProdigiAttributes(config, {
      validAttributes: product.attributes,
      sku,
    });
    console.log('[Pricing] Product valid attributes:', Object.keys(product.attributes));
    console.log('[Pricing] Attributes being sent:', attributes);

    // Step 5: Build quote request
    // Use detected country for accurate shipping costs
    const quoteRequest = {
      destinationCountryCode: country,
      shippingMethod: config.shippingMethod || 'Standard' as const, // Use selected method or default to Standard
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
      shippingMethod: quoteRequest.shippingMethod,
    });

    // Step 6: Get real quotes from Prodigi for ALL shipping methods
    // Prodigi API may only return the requested method, so we request all methods
    const shippingMethods: Array<'Budget' | 'Standard' | 'Express' | 'Overnight'> = 
      ['Budget', 'Standard', 'Express', 'Overnight'];
    
    const quotePromises = shippingMethods.map(method => 
      prodigiSDK.quotes.create({
        ...quoteRequest,
        shippingMethod: method,
      }).catch(error => {
        console.warn(`[Pricing] Failed to get quote for ${method}:`, error.message);
        return []; // Return empty array if method is not available
      })
    );

    const quoteResults = await Promise.all(quotePromises);
    const quotes = quoteResults.flat().filter(Boolean);

    if (quotes.length === 0) {
      throw new Error('No shipping quotes available');
    }

    console.log(`[Pricing] Received ${quotes.length} quote(s) for ${quotes.map(q => q.shipmentMethod).join(', ')}`);

    // Step 7: Get user's currency from country
    const userCountry = getCountry(country);
    const userCurrency = userCountry?.currency || 'USD';
    console.log(`[Pricing] User currency: ${userCurrency} (from country: ${country})`);

    // Step 8: Process all shipping methods with currency conversion
    const shippingOptions = await Promise.all(quotes.map(async (quote) => {
      const productionCountry = quote.shipments?.[0]?.fulfillmentLocation?.countryCode || 'US';
    const deliveryEstimate = estimateDeliveryTime(
      productionCountry,
      country,
        quote.shipmentMethod
      );
      
      // Get Prodigi's currency from quote
      const prodigiCurrency = quote.costSummary.totalCost?.currency || 'USD';
      const prodigiPrices = {
        items: Number(quote.costSummary.items?.amount) || 0,
        shipping: Number(quote.costSummary.shipping?.amount) || 0,
        total: Number(quote.costSummary.totalCost?.amount) || 0,
      };

      // Convert to user's currency if different
      let displayCurrency = prodigiCurrency;
      let displayPrices = prodigiPrices;
      let originalCurrency = prodigiCurrency;
      let originalPrices = prodigiPrices;

      if (prodigiCurrency !== userCurrency) {
        try {
          console.log(`[Pricing] Converting ${prodigiCurrency} → ${userCurrency} for ${quote.shipmentMethod}`);
          displayCurrency = userCurrency;
          displayPrices = {
            items: await currencyService.convert(prodigiPrices.items, prodigiCurrency, userCurrency),
            shipping: await currencyService.convert(prodigiPrices.shipping, prodigiCurrency, userCurrency),
            total: await currencyService.convert(prodigiPrices.total, prodigiCurrency, userCurrency),
          };
          console.log(`[Pricing] Converted ${quote.shipmentMethod}: ${prodigiCurrency} ${prodigiPrices.total.toFixed(2)} → ${userCurrency} ${displayPrices.total.toFixed(2)}`);
        } catch (error) {
          console.warn(`[Pricing] Currency conversion failed for ${quote.shipmentMethod}, using Prodigi currency:`, error);
          // Fallback: use Prodigi currency if conversion fails
          displayCurrency = prodigiCurrency;
          displayPrices = prodigiPrices;
        }
      } else {
        console.log(`[Pricing] No conversion needed for ${quote.shipmentMethod} (${prodigiCurrency} = ${userCurrency})`);
      }
      
      return {
        method: quote.shipmentMethod,
        cost: {
          items: displayPrices.items,
          shipping: displayPrices.shipping,
          total: displayPrices.total,
          currency: displayCurrency,
        },
        originalCost: {
          items: originalPrices.items,
          shipping: originalPrices.shipping,
          total: originalPrices.total,
          currency: originalCurrency,
        },
        delivery: {
          min: deliveryEstimate.totalDays.min,
          max: deliveryEstimate.totalDays.max,
          formatted: formatDeliveryEstimate(deliveryEstimate),
          note: deliveryEstimate.note,
        },
        productionCountry,
      };
    }));

    // Step 9: Find selected method or Standard as default
    const selectedMethod = config.shippingMethod || 'Standard';
    const selectedQuote = shippingOptions.find(o => o.method === selectedMethod) || shippingOptions.find(o => o.method === 'Standard') || shippingOptions[0];

    // Step 10: Find recommended method (best value: lowest total with reasonable delivery)
    const recommended = shippingOptions.reduce((best, current) => {
      // Prefer method with lower total cost
      // But don't sacrifice too much on delivery time (max 3 days difference)
      if (current.cost.total < best.cost.total && 
          current.delivery.max <= best.delivery.max + 3) {
        return current;
      }
      // If same price, prefer faster delivery
      if (current.cost.total === best.cost.total && 
          current.delivery.max < best.delivery.max) {
        return current;
      }
      return best;
    }, shippingOptions[0]);

    const { cost, originalCost, delivery, productionCountry } = selectedQuote;

    console.log('[Pricing] Quote received:', {
      sku,
      total: cost.total,
      items: cost.items,
      shipping: cost.shipping,
      currency: cost.currency,
      originalCurrency: originalCost.currency,
      productionCountry,
      destinationCountry: country,
      deliveryEstimate: delivery.formatted,
      availableMethods: shippingOptions.map(o => o.method),
      recommended: recommended.method,
    });

    // Step 11: Return pricing with all shipping options
    return NextResponse.json({
      success: true,
      sku, // Return the SKU so it can be saved to config
      pricing: {
        total: cost.total,
        subtotal: cost.items,
        shipping: cost.shipping,
        currency: cost.currency, // Display currency (user's currency)
        originalCurrency: originalCost.currency, // Prodigi's original currency
        originalTotal: originalCost.total, // Original price in Prodigi currency
        productionCountry,
        destinationCountry: country,
        sla: delivery.max, // Use maximum estimated days for safety
        deliveryEstimate: {
          min: delivery.min,
          max: delivery.max,
          formatted: delivery.formatted,
          note: delivery.note,
        },
        estimated: false, // This is a REAL quote from Prodigi
      },
      shippingOptions: shippingOptions.map(option => ({
        method: option.method,
        cost: option.cost, // Display cost in user currency
        originalCost: option.originalCost, // Original cost in Prodigi currency
        delivery: option.delivery,
        productionCountry: option.productionCountry,
      })),
      recommended: recommended.method, // ✅ Recommended method
    });
  } catch (error: any) {
    console.error('[Pricing] Error:', error);
    console.error('[Pricing] Error stack:', error.stack);

    // Log detailed error info
    if (error.validationErrors) {
      console.error('[Pricing] Validation errors:', JSON.stringify(error.validationErrors, null, 2));
    }

    if (error.statusCode === 400 && error.data) {
      console.error('[Pricing] API response:', JSON.stringify(error.data, null, 2));
    }

    // Log request details for debugging
    console.error('[Pricing] Failed request details:', {
      productType: rawConfig?.productType,
      size: rawConfig?.size,
      country,
      sku: rawConfig?.sku,
    });

    // Get user-friendly error message
    const friendlyError = getUserFriendlyError(error);
    
    // Return error response with user-friendly message
    return NextResponse.json({
      error: friendlyError.title,
      message: friendlyError.message,
      action: friendlyError.action,
      retryable: friendlyError.retryable,
      details: process.env.NODE_ENV === 'development' ? (error.validationErrors || error.data || null) : undefined,
      technicalError: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
 * 
 * @deprecated Use buildProdigiAttributes from @/lib/checkout/utils/attribute-builder instead
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
          // Clear mount from config to prevent sending invalid attribute
          config.mount = 'none';
        } else {
          console.warn(`[Attributes] Mount value "${mountValue}" not valid for this product. Valid options:`, validMounts);
          // Don't set mount attribute - invalid value
          // Try to find closest match or default to none
          if (validMounts.length > 0) {
            // Try to find a mount with similar thickness
            const mountThickness = mountValue.match(/(\d+\.?\d*)mm/)?.[1];
            if (mountThickness) {
              const closestMount = validMounts.find(m => 
                m.includes(mountThickness) || 
                m.includes(Math.round(parseFloat(mountThickness)).toString())
              );
              if (closestMount) {
                console.log(`[Attributes] Using closest mount match: ${closestMount}`);
                attributes['mount'] = closestMount;
                addIfValid('mountColor', config.mountColor);
              } else {
                // No close match, don't set mount
                config.mount = 'none';
              }
            } else {
              config.mount = 'none';
            }
          } else {
            config.mount = 'none';
          }
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

  // Check if finish is required but not set (metal products require finish)
  // This handles cases where finish is required but not provided or invalid
  if (!attributes['finish'] && isValidAttribute('finish') && validAttributes['finish'] && validAttributes['finish'].length > 0) {
    // Product requires a finish but none was set (or invalid value was provided)
    // Prefer "high gloss" or "satin" as defaults, fallback to first available
    const preferredFinishes = ['high gloss', 'satin', 'mid-gloss', 'sheer glossy', 'sheer matte'];
    const defaultFinish = preferredFinishes.find(f => 
      validAttributes['finish'].some(v => v.toLowerCase() === f.toLowerCase())
    ) || validAttributes['finish'][0];
    
    // Use exact case from Prodigi
    const matchingFinish = validAttributes['finish'].find(
      opt => opt.toLowerCase() === defaultFinish.toLowerCase()
    ) || validAttributes['finish'][0];
    
    console.log(`[Attributes] Product has finish attribute but finish is not set. Using default: ${matchingFinish}`);
    attributes['finish'] = matchingFinish;
  }

  // Check if wrap is required but not set (canvas and framed-canvas products require wrap)
  // This handles cases where wrap is required but not provided or invalid
  if (!attributes['wrap'] && isValidAttribute('wrap') && validAttributes['wrap'] && validAttributes['wrap'].length > 0) {
    // Product requires a wrap but none was set (or invalid value was provided)
    // Prefer "ImageWrap" or "Black" as defaults, fallback to first available
    const preferredWraps = ['ImageWrap', 'Black', 'White', 'MirrorWrap'];
    const defaultWrap = preferredWraps.find(w => 
      validAttributes['wrap'].some(v => v.toLowerCase() === w.toLowerCase())
    ) || validAttributes['wrap'][0];
    
    // Use exact case from Prodigi
    const matchingWrap = validAttributes['wrap'].find(
      opt => opt.toLowerCase() === defaultWrap.toLowerCase()
    ) || validAttributes['wrap'][0];
    
    console.log(`[Attributes] Product has wrap attribute but wrap is not set. Using default: ${matchingWrap}`);
    attributes['wrap'] = matchingWrap;
  }

  // Check if color is required but not set (either config.frameColor was invalid or not provided)
  // This handles cases where user selects an invalid color (e.g., "Gold" when only "black", "white", etc. are valid)
  if (!attributes['color'] && isValidAttribute('color') && validAttributes['color'] && validAttributes['color'].length > 0) {
    // Product requires a color but none was set (or invalid value was provided)
    const defaultColor = validAttributes['color'][0];
    console.log(`[Attributes] Product has color attribute but color is not set. Using default: ${defaultColor}`);
    attributes['color'] = defaultColor;
  }

  // Check if paperType is required but not set
  if (!attributes['paperType'] && isValidAttribute('paperType') && validAttributes['paperType'] && validAttributes['paperType'].length > 0) {
    const defaultPaperType = validAttributes['paperType'][0];
    console.log(`[Attributes] Product has paperType attribute but paperType is not set. Using default: ${defaultPaperType}`);
    attributes['paperType'] = defaultPaperType;
  }

  // Check if edge is required but not set (canvas products sometimes require edge)
  if (!attributes['edge'] && isValidAttribute('edge') && validAttributes['edge'] && validAttributes['edge'].length > 0) {
    const defaultEdge = validAttributes['edge'][0];
    console.log(`[Attributes] Product has edge attribute but edge is not set. Using default: ${defaultEdge}`);
    attributes['edge'] = defaultEdge;
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
