/**
 * Configuration Summary Component
 * Shows current frame configuration with inline editing
 * Now with dynamic option visibility based on facets!
 */

'use client';

import { useEffect } from 'react';
import { useStudioStore } from '@/store/studio';
import { FRAME_SIZES, getSizeInCm, getSizeEntry } from '@/lib/utils/size-conversion';
import { getAspectRatioCategory } from '@/lib/utils/aspect-ratio';

export function ConfigurationSummary() {
  const { 
    config, 
    updateConfigAsync, 
    availableOptions, 
    isFacetsLoading,
    updateAvailableOptionsAsync 
  } = useStudioStore();
  
  // Initialize aspect ratio from size if not set (only on mount, not on every change)
  useEffect(() => {
    if (config.size && !config.aspectRatio) {
      const calculatedAspectRatio = getAspectRatioCategory(config.size);
      updateConfigAsync({ aspectRatio: calculatedAspectRatio } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Fetch available options on mount and when configuration changes
  // Re-fetch when product type, frame style, size, aspect ratio, country, or other key options change
  // This ensures options adapt dynamically to current selections and country
  useEffect(() => {
    // Build filters based on current configuration to get adaptive options
    const filters: Partial<Record<string, string[]>> & {
      aspectRatioLabel?: 'Landscape' | 'Portrait' | 'Square';
    } = {};
    
    // Filter by frame style if selected (affects mount, glaze, edge availability)
    if (config.frameStyle && config.frameStyle !== 'classic' && config.frameStyle !== 'Classic') {
      filters.frameStyles = [config.frameStyle];
    }
    
    // Filter by size if selected (affects which options are available)
    if (config.size) {
      filters.sizes = [config.size];
    }
    
    // Filter by frame color if selected (some frame colors have different available options)
    if (config.frameColor && config.frameColor !== 'black') {
      filters.frameColors = [config.frameColor];
    }

    // Filter by aspect ratio selection (used by Azure Search to limit products)
    if (config.aspectRatio) {
      filters.aspectRatioLabel = config.aspectRatio;
    }
    
    updateAvailableOptionsAsync(config.productType, filters);
  }, [
    config.productType, 
    config.frameStyle,
    config.size,
    config.frameColor,
    config.aspectRatio,
    config.destinationCountry, // Refresh options when country changes
    updateAvailableOptionsAsync
  ]);

  // Get current aspect ratio (from config or calculate from size)
  const getCurrentAspectRatio = (): 'Portrait' | 'Landscape' | 'Square' => {
    if (config.aspectRatio) {
      return config.aspectRatio;
    }
    // Calculate from size if aspect ratio not set
    if (config.size) {
      return getAspectRatioCategory(config.size);
    }
    return 'Landscape'; // Default
  };

  // Helper function to get all available sizes (not filtered)
  const getAllAvailableSizes = (): string[] => {
    if (availableOptions?.sizes && availableOptions.sizes.length > 0) {
      // Normalize facet sizes to "WxH" format (facets might have different formats)
      return availableOptions.sizes.map(size => {
        // Normalize formats like "8x10", "8×10", "8 x 10" to "8x10"
        return size.replace(/[×\s]/g, 'x').toLowerCase();
      });
    } else {
      // Fallback to static FRAME_SIZES
      return FRAME_SIZES.map(s => s.inches);
    }
  };

  // Helper function to get normalized and sorted sizes list, filtered by aspect ratio
  const getNormalizedSizes = (filterByAspectRatio?: 'Portrait' | 'Landscape' | 'Square'): string[] => {
    let baseOptions = getAllAvailableSizes();
    
    // Filter by aspect ratio (from parameter, config, or calculated from current size)
    const aspectRatioToFilter = filterByAspectRatio || getCurrentAspectRatio();
    
    // Filter sizes to only show those with the selected aspect ratio
    const filteredByAspect = baseOptions.filter(size => {
      const sizeAspectRatio = getAspectRatioCategory(size);
      return sizeAspectRatio === aspectRatioToFilter;
    });
    
    // If filtering removed everything (e.g., sizes not parsable or no matches),
    // fall back to the unfiltered list so the dropdown is never empty.
    baseOptions = filteredByAspect.length > 0 ? filteredByAspect : baseOptions;
    
    // Ensure current size is included (in case it comes from a SKU that's not in the list)
    if (config.size && !baseOptions.includes(config.size)) {
      const sizeAspectRatio = getAspectRatioCategory(config.size);
      // Only add if it matches the current aspect ratio filter
      if (sizeAspectRatio === aspectRatioToFilter) {
      baseOptions = [...baseOptions, config.size];
      }
    }
    
    // Sort by area (width * height)
    return baseOptions.sort((a, b) => {
      const [aw, ah] = a.split('x').map(Number);
      const [bw, bh] = b.split('x').map(Number);
      return (aw * ah) - (bw * bh);
    });
  };

  // Build dynamic options based on available facets
  const getOptions = () => {
    const normalizedSizes = getNormalizedSizes();
    const opts: Array<{
      label: string;
      value: any;
      key: string;
      editable: boolean;
      options?: string[];
      displayNames?: Record<string, string>;
      description?: string;
      showIf: boolean;
    }> = [
      {
        label: '🎨 Product Type',
        value: config.productType,
        key: 'productType',
        editable: true,
        options: ['framed-print', 'canvas', 'framed-canvas', 'acrylic', 'metal', 'poster'],
        displayNames: {
          'framed-print': 'Framed Print',
          'canvas': 'Canvas',
          'framed-canvas': 'Framed Canvas',
          'acrylic': 'Acrylic Print',
          'metal': 'Metal Print',
          'poster': 'Poster'
        } as Record<string, string>,
        showIf: true,
      },
    ];

    // Aspect Ratio - show BEFORE size (editable option that filters sizes)
    if (availableOptions?.hasAspectRatio) {
      const currentAspectRatio = getCurrentAspectRatio();
      
      opts.push({
        label: '📐 Aspect Ratio',
        value: currentAspectRatio,
        key: 'aspectRatio',
        editable: true, // Editable - user can change to filter sizes
        options: availableOptions.aspectRatios || ['Landscape', 'Portrait', 'Square'],
        description: 'Select aspect ratio to filter available sizes',
        showIf: true,
      });
    }

    // Size - filtered by aspect ratio
    opts.push({
        label: '🖼️ Size',
        value: config.size,
        key: 'size',
        editable: true,
        options: normalizedSizes,
        displayNames: (() => {
          // Build display names for ALL sizes in the options list
          // This ensures every size has a proper label with CM conversion
          const displayNames: Record<string, string> = {};
          
          // Generate display names for all sizes using getSizeEntry
          // This will create dynamic entries with CM conversions for any size
          normalizedSizes.forEach(size => {
            const sizeEntry = getSizeEntry(size);
            displayNames[size] = sizeEntry.label;
          });
          
          return displayNames;
        })(),
        description: getSizeInCm(config.size),
        showIf: true,
    });

    // Frame Style - only show if available (before Frame Color)
    if (availableOptions?.hasFrameStyle) {
      opts.push({
        label: '🖼️ Frame Style',
        value: config.frameStyle || 'Classic',
        key: 'frameStyle',
        editable: true,
        options: availableOptions.frameStyles.length > 0
          ? availableOptions.frameStyles
          : ['Classic', 'Box Frame', 'Aluminium', 'Float Frame, 38mm Standard Stretcher Bar'],
        displayNames: availableOptions.frameStyles.reduce((acc, style) => {
          acc[style] = style;
          return acc;
        }, {} as Record<string, string>),
        description: 'Frame style and thickness',
        showIf: true,
      });
    }

    // Frame Color - only show if available
    if (availableOptions?.hasFrameColor) {
      opts.push({
        label: '🎨 Frame Color',
        value: config.frameColor,
        key: 'frameColor',
        editable: true,
        options: availableOptions.frameColors.length > 0
          ? availableOptions.frameColors
          : ['black', 'white', 'natural', 'brown', 'gold', 'silver'],
        showIf: true,
      });
    }

    // Glaze - only show if available
    if (availableOptions?.hasGlaze) {
      opts.push({
        label: '💎 Glaze',
        value: config.glaze,
        key: 'glaze',
        editable: true,
        options: availableOptions.glazes.length > 0
          ? availableOptions.glazes.map(g => g.toLowerCase().replace(/\s+/g, '-'))
          : ['none', 'acrylic', 'glass', 'motheye'],
        displayNames: availableOptions.glazes.reduce((acc, g) => {
          const key = g.toLowerCase().replace(/\s+/g, '-');
          acc[key] = g;
          return acc;
        }, {} as Record<string, string>),
        description: config.glaze === 'motheye' || config.glaze === 'glass' 
          ? 'Museum-quality glass with 99% UV protection'
          : 'Standard acrylic protection',
        showIf: true,
      });
    }

    // Mount - only show if available
    if (availableOptions?.hasMount) {
      // Better display names for mount options
      const mountDisplayNames: Record<string, string> = {
        'none': 'No Mat',
        'no mount / mat': 'No Mat',
        '1.4mm': '1.4mm (Slim)',
        '2.0mm': '2.0mm (Standard)',
        '2.4mm': '2.4mm (Premium)',
      };
      
      // Filter out "no mount / mat" from available options since we're adding 'none' explicitly
      const mountOptions = availableOptions.mounts
        .map(m => m.toLowerCase())
        .filter(m => !m.includes('no mount') && !m.includes('no mat'));
      
      opts.push({
        label: '📄 Mount',
        value: config.mount,
        key: 'mount',
        editable: true,
        options: ['none', ...mountOptions],
        displayNames: mountDisplayNames,
        description: config.mount !== 'none' 
          ? 'Mat board creates professional border around artwork'
          : undefined,
        showIf: true,
      });

      // Mount Color - only show if mount is not 'none'
      if (config.mount && config.mount !== 'none' && availableOptions?.hasMountColor) {
        // Better display names for mount colors
        const mountColorDisplayNames: Record<string, string> = {
          'snow white': 'Snow White',
          'off white': 'Off White',
          'off-white': 'Off White',
          'black': 'Black',
        };
        
        opts.push({
          label: '🎨 Mount Color',
          value: config.mountColor,
          key: 'mountColor',
          editable: true,
          options: availableOptions.mountColors.map(c => c.toLowerCase()),
          displayNames: mountColorDisplayNames,
          description: 'Color of the mat board border',
          showIf: true,
        });
      }
    }

    // Edge/Depth - show if available (for canvas products and some framed prints)
    if (availableOptions?.hasEdge) {
      const edgeOptions = availableOptions.edges.length > 0 
        ? ['auto', ...availableOptions.edges.filter(e => e !== 'auto')]
        : ['auto', '19mm', '38mm', 'Rolled'];
      
      const isCanvasProduct = ['canvas', 'framed-canvas'].includes(config.productType);
      
      opts.push({
        label: isCanvasProduct ? '📏 Edge Depth' : '📏 Edge',
        value: config.edge || 'auto',
        key: 'edge',
        editable: true,
        options: edgeOptions,
        displayNames: {
          'auto': 'Auto (Recommended)',
          '19mm': '19mm',
          '38mm': '38mm',
          'rolled': 'Rolled',
        },
        description: isCanvasProduct 
          ? 'Canvas edge depth - 19mm is thinner, 38mm is standard'
          : 'Frame edge depth',
        showIf: true,
      });
    }

    // Canvas Type - only show for canvas/framed-canvas products
    if (['canvas', 'framed-canvas'].includes(config.productType)) {
      opts.push({
        label: '🎨 Canvas Type',
        value: config.canvasType || 'auto',
        key: 'canvasType',
        editable: true,
        options: ['auto', 'standard', 'slim', 'eco'],
        displayNames: {
          'auto': 'Auto (Recommended)',
          'standard': 'Standard Canvas',
          'slim': 'Slim Canvas (19mm)',
          'eco': 'Eco Canvas'
        },
        description: 'Canvas type affects thickness and appearance',
        showIf: true,
      });
    }

    // Wrap - only show for canvas products
    if (availableOptions?.hasWrap) {
      opts.push({
        label: '🖼️ Wrap',
        value: config.wrap || 'Black',
        key: 'wrap',
        editable: true,
        options: availableOptions.wraps,
        displayNames: {
          'Black': 'Black Wrap',
          'White': 'White Wrap',
          'ImageWrap': 'Image Wrap',
          'MirrorWrap': 'Mirror Wrap'
        },
        showIf: true,
      });
    }

    // Finish - only show if available
    if (availableOptions?.hasFinish) {
      const finishDisplayNames: Record<string, string> = {
        'gloss': 'Gloss',
        'lustre': 'Lustre',
        'matte': 'Matte',
        'high gloss': 'High Gloss',
      };
      
      opts.push({
        label: '✨ Finish',
        value: config.finish || 'matte',
        key: 'finish',
        editable: true,
        options: availableOptions.finishes.map(f => f.toLowerCase()),
        displayNames: availableOptions.finishes.reduce((acc, f) => {
          const key = f.toLowerCase();
          acc[key] = finishDisplayNames[key] || f;
          return acc;
        }, {} as Record<string, string>),
        showIf: true,
      });
    }

    // Paper Type - only show if available
    if (availableOptions?.hasPaperType) {
      opts.push({
        label: '📄 Paper Type',
        value: config.paperType,
        key: 'paperType',
        editable: true,
        options: availableOptions.paperTypes.map(p => p.toLowerCase().replace(/\s+/g, '-')),
        displayNames: availableOptions.paperTypes.reduce((acc, p) => {
          const key = p.toLowerCase().replace(/\s+/g, '-');
          acc[key] = p;
          return acc;
        }, {} as Record<string, string>),
        showIf: true,
      });
    }

    return opts.filter(opt => opt.showIf);
  };

  const options = getOptions();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Configuration
        </h3>
        {isFacetsLoading && (
          <span className="text-xs text-gray-500 animate-pulse">
            Loading options...
          </span>
        )}
      </div>
      <div className="space-y-2">
        {options.map((option) => (
            <div
              key={option.key}
              className="py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{option.label}</span>
                {option.editable ? (
                  <select
                    value={option.value}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      
                      // Handle aspect ratio changes - filter sizes and update size if needed
                      if (option.key === 'aspectRatio') {
                        const newAspectRatio = newValue as 'Portrait' | 'Landscape' | 'Square';
                        const currentSizeAspectRatio = config.size ? getAspectRatioCategory(config.size) : 'Landscape';
                        
                        // If current size doesn't match new aspect ratio, find first matching size
                        if (currentSizeAspectRatio !== newAspectRatio) {
                          // Get sizes filtered by new aspect ratio
                          const matchingSizes = getNormalizedSizes(newAspectRatio);
                          
                          if (matchingSizes.length > 0) {
                            updateConfigAsync({ 
                              aspectRatio: newAspectRatio,
                              size: matchingSizes[0] // Use first (smallest) matching size
                            } as any);
                          } else {
                            updateConfigAsync({ aspectRatio: newAspectRatio } as any);
                          }
                        } else {
                          updateConfigAsync({ aspectRatio: newAspectRatio } as any);
                        }
                      } 
                      // Handle size changes - update aspect ratio to match
                      else if (option.key === 'size') {
                        const newSize = newValue;
                        const newAspectRatio = getAspectRatioCategory(newSize);
                        updateConfigAsync({ 
                          size: newSize,
                          aspectRatio: newAspectRatio 
                        } as any);
                      }
                      // Handle other option changes normally
                      else {
                        updateConfigAsync({ [option.key]: newValue } as any);
                      }
                    }}
                    disabled={isFacetsLoading && option.key !== 'productType'}
                    className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer capitalize hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {option.options?.map((opt) => (
                      <option key={opt} value={opt} className="capitalize bg-white text-gray-900">
                        {option.displayNames && opt in option.displayNames 
                          ? option.displayNames[opt as keyof typeof option.displayNames] 
                          : opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-gray-900 capitalize">
                    {option.displayNames && option.value in option.displayNames 
                      ? option.displayNames[option.value as keyof typeof option.displayNames] 
                      : option.value}
                  </span>
                )}
              </div>
              {option.description && (
                <p className="text-xs text-gray-600 mt-1.5">{option.description}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

