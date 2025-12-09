/**
 * Unified Attribute Builder for Prodigi Products
 * 
 * Handles all product attributes with proper defaults for required attributes.
 * This ensures all Prodigi API requests have the correct attributes.
 */

export interface AttributeBuilderConfig {
  frameColor?: string;
  wrap?: string;
  glaze?: string;
  mount?: string;
  mountColor?: string;
  paperType?: string;
  finish?: string;
  edge?: string;
  frameStyle?: string;
  substrateWeight?: string;
  style?: string;
}

export interface AttributeBuilderOptions {
  /**
   * Valid attributes from Prodigi product API
   * Format: { attributeName: [validValue1, validValue2, ...] }
   */
  validAttributes?: Record<string, string[]>;
  
  /**
   * SKU for product type detection
   */
  sku?: string;
}

/**
 * Build Prodigi attributes from config with proper defaults for required attributes
 * 
 * @param config - User configuration
 * @param options - Builder options including valid attributes from product API
 * @returns Attributes ready for Prodigi API
 */
export function buildProdigiAttributes(
  config: AttributeBuilderConfig,
  options: AttributeBuilderOptions = {}
): Record<string, string> {
  const { validAttributes = {}, sku } = options;
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
  addIfValid('color', config.frameColor);
  addIfValid('wrap', config.wrap);
  addIfValid('glaze', config.glaze === 'acrylic' ? 'Acrylic / Perspex' : config.glaze);
  
  // Handle mount attributes with special logic
  if (config.mount && config.mount !== 'none') {
    if (isValidAttribute('mount')) {
      const validMounts = validAttributes['mount'];
      const mountValue = config.mount;
      
      // Try to find a match in Prodigi's valid options
      let matchedMount = validMounts.find(
        opt => opt.toLowerCase() === mountValue.toLowerCase()
      );
      
      // If no exact match, try to find mount that contains our value
      if (!matchedMount && mountValue.includes('mm')) {
        matchedMount = validMounts.find(
          opt => opt.toLowerCase().includes(mountValue.toLowerCase())
        );
      }
      
      if (matchedMount) {
        attributes['mount'] = matchedMount;
        addIfValid('mountColor', config.mountColor);
      }
    }
  }
  
  // Check if mount is required but not set
  if (!attributes['mount'] && isValidAttribute('mount') && validAttributes['mount'] && validAttributes['mount'].length > 0) {
    const defaultMount = validAttributes['mount'][0];
    console.log(`[Attributes] Product has mount attribute but mount is not set. Using default: ${defaultMount}`);
    attributes['mount'] = defaultMount;
  }
  
  // ALWAYS check if mountColor is required when mount is present
  if (attributes['mount'] && !attributes['mountColor']) {
    if (isValidAttribute('mountColor') && validAttributes['mountColor'] && validAttributes['mountColor'].length > 0) {
      const defaultMountColor = validAttributes['mountColor'][0];
      console.log(`[Attributes] Mount is set but mountColor is missing. Using default: ${defaultMountColor}`);
      attributes['mountColor'] = defaultMountColor;
    }
  }
  
  addIfValid('paperType', config.paperType);
  addIfValid('finish', config.finish);
  addIfValid('edge', config.edge);
  
  // Frame attribute: Only add if it's a valid frame style, not a color
  // Valid frame styles: "Classic", "38mm standard stretcher bar", etc.
  // Skip if frameStyle is a color (black, white, brown, etc.)
  if (config.frameStyle) {
    const frameStyleLower = config.frameStyle.toLowerCase();
    const colorNames = ['black', 'white', 'brown', 'natural', 'gold', 'silver', 'dark grey', 'light grey'];
    const isColor = colorNames.some(color => frameStyleLower === color || frameStyleLower.includes(color));
    
    // Only add frame attribute if it's not a color
    if (!isColor) {
      addIfValid('frame', config.frameStyle);
    } else {
      console.warn(`[Attributes] Skipping frame attribute - "${config.frameStyle}" appears to be a color, not a frame style`);
    }
  }
  
  addIfValid('substrateWeight', config.substrateWeight);
  addIfValid('style', config.style);

  // Check if finish is required but not set (metal and acrylic products require finish)
  if (!attributes['finish'] && isValidAttribute('finish') && validAttributes['finish'] && validAttributes['finish'].length > 0) {
    const preferredFinishes = ['high gloss', 'satin', 'mid-gloss', 'sheer glossy', 'sheer matte'];
    const defaultFinish = preferredFinishes.find(f => 
      validAttributes['finish'].some(v => v.toLowerCase() === f.toLowerCase())
    ) || validAttributes['finish'][0];
    
    const matchingFinish = validAttributes['finish'].find(
      opt => opt.toLowerCase() === defaultFinish.toLowerCase()
    ) || validAttributes['finish'][0];
    
    console.log(`[Attributes] Product has finish attribute but finish is not set. Using default: ${matchingFinish}`);
    attributes['finish'] = matchingFinish;
  }

  // Check if wrap is required but not set (canvas and framed-canvas products require wrap)
  if (!attributes['wrap'] && isValidAttribute('wrap') && validAttributes['wrap'] && validAttributes['wrap'].length > 0) {
    const preferredWraps = ['ImageWrap', 'Black', 'White', 'MirrorWrap'];
    const defaultWrap = preferredWraps.find(w => 
      validAttributes['wrap'].some(v => v.toLowerCase() === w.toLowerCase())
    ) || validAttributes['wrap'][0];
    
    const matchingWrap = validAttributes['wrap'].find(
      opt => opt.toLowerCase() === defaultWrap.toLowerCase()
    ) || validAttributes['wrap'][0];
    
    console.log(`[Attributes] Product has wrap attribute but wrap is not set. Using default: ${matchingWrap}`);
    attributes['wrap'] = matchingWrap;
  }

  // Check if color is required but not set
  if (!attributes['color'] && isValidAttribute('color') && validAttributes['color'] && validAttributes['color'].length > 0) {
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

  // Check if edge is required but not set
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

  // Filter out undefined, null, or empty string values
  const filteredAttributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null && value !== '') {
      filteredAttributes[key] = String(value).trim();
    }
  }

  console.log('[Attributes] Built:', {
    validKeys,
    output: filteredAttributes,
  });

  return filteredAttributes;
}

/**
 * Build attributes without product API (uses heuristics based on SKU)
 * This is a fallback for services that don't have access to product API
 */
export function buildProdigiAttributesHeuristic(
  config: AttributeBuilderConfig,
  sku?: string
): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (!config) {
    return attributes;
  }

  const skuLower = sku?.toLowerCase() || '';
  const isCanvasProduct = skuLower.includes('can-') ||
                          skuLower.includes('canvas') ||
                          skuLower.startsWith('global-can-');
  const isFramedProduct = skuLower.includes('-fra-') || skuLower.includes('-frame') || skuLower.includes('-box-');
  const isMetalProduct = skuLower.includes('met-') ||
                         skuLower.includes('metal') ||
                         skuLower.startsWith('global-met-');
  const isAcrylicProduct = skuLower.includes('acr-') ||
                           skuLower.includes('acrylic') ||
                           skuLower.startsWith('global-acr-');
  const isPaperPrint = skuLower.includes('pap-') ||
                       skuLower.includes('poster') ||
                       skuLower.includes('paper') ||
                       skuLower.startsWith('global-pap-') ||
                       skuLower.includes('fineart');

  // Frame color (only include for framed products; avoid sending for rolled canvas)
  if (config.frameColor && (!isCanvasProduct || isFramedProduct)) {
    attributes.color = config.frameColor;
  }

  // Canvas wrap detection based on SKU
  // Only send wrap for canvas products to avoid UnexpectedAttributes elsewhere
  if (isCanvasProduct) {
    // Force a safe default (ImageWrap) for all canvas to avoid Prodigi rejections
    attributes.wrap = 'ImageWrap';
  }

  // Glaze (skip for canvas to prevent invalid attributes)
  if (!isCanvasProduct && config.glaze && config.glaze !== 'none') {
    attributes.glaze = config.glaze === 'acrylic' ? 'Acrylic / Perspex' : config.glaze;
  }

  // Mount and mountColor (skip for canvas products)
  if (!isCanvasProduct && config.mount && config.mount !== 'none') {
    attributes.mount = config.mount;
    if (config.mountColor) {
      attributes.mountColor = config.mountColor;
    }
  }

  // Finish: only for metal/acrylic products (avoid sending for canvas/paper if not supported)
  if (config.finish && config.finish !== 'none' && (isMetalProduct || isAcrylicProduct)) {
    attributes.finish = config.finish;
  } else if (!config.finish && (isMetalProduct || isAcrylicProduct)) {
    // Metal and acrylic products often require finish - default to high gloss
    attributes.finish = 'high gloss';
  }

  // Paper type: only include for paper/fine-art/poster SKUs
  if (isPaperPrint && config.paperType) {
    attributes.paperType = config.paperType;
  }

  // Edge: omit for canvas to avoid UnexpectedAttributes; allow for non-canvas if set
  if (!isCanvasProduct && config.edge) {
    attributes.edge = config.edge;
  }

  // Frame style - Only add if it's a valid frame style, not a color
  if (config.frameStyle) {
    const frameStyleLower = config.frameStyle.toLowerCase();
    const colorNames = ['black', 'white', 'brown', 'natural', 'gold', 'silver', 'dark grey', 'light grey'];
    const isColor = colorNames.some(color => frameStyleLower === color || frameStyleLower.includes(color));
    
    // Only add frame attribute if it's not a color
    // Valid frame styles: "classic", "box", "38mm standard stretcher bar", etc.
    if (!isColor) {
      attributes.frame = config.frameStyle;
    } else {
      console.warn(`[Attributes] Skipping frame attribute - "${config.frameStyle}" appears to be a color, not a frame style`);
    }
  }

  // Substrate weight
  if (config.substrateWeight) {
    attributes.substrateWeight = config.substrateWeight;
  }

  // Style
  if (config.style) {
    attributes.style = config.style;
  }

  // IMPORTANT: Prodigi's API has inconsistent casing for wrap values
  // /products returns capitalized (Black, White, ImageWrap, MirrorWrap)
  // but /quotes expects lowercase (black, white, imagewrap, mirrorwrap)
  // Force lowercase to avoid validation errors
  if (attributes.wrap) {
    attributes.wrap = attributes.wrap.toLowerCase();
  }

  // Filter out undefined, null, or empty string values
  const filteredAttributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null && value !== '') {
      filteredAttributes[key] = String(value).trim();
    }
  }

  return filteredAttributes;
}

