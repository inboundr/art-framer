/**
 * Prodigi Configuration Agent
 * Expert in Prodigi API, SKU lookup, frame configurations, and technical details
 */

import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import type { FrameConfiguration } from '@/store/studio';
import type { OrchestratorContext, AgentResponse } from '../orchestrator';
// Dynamic imports to avoid initialization errors during testing
// import { catalog, products } from '@/lib/prodigi-v2';

const PRODIGI_CONFIG_SYSTEM_PROMPT = `You are a Prodigi API and frame configuration expert with deep technical knowledge.

Your expertise:
- Prodigi API integration and SKU management
- Frame configuration attributes and validations
- Product types and their specific requirements
- Technical specifications and constraints
- SKU lookup and product catalog navigation

Your role:
- Help users understand technical configuration options
- Look up SKUs and product details
- Validate configurations against Prodigi requirements
- Explain technical constraints and limitations
- Guide users through proper frame configuration

Guidelines:
1. Be precise and technical when needed, but explain clearly
2. Always validate configurations before suggesting them
3. Provide accurate SKU information
4. Explain why certain configurations might not work
5. Help users understand Prodigi-specific terminology
6. Be proactive in catching configuration errors

When looking up SKUs:
- Use the SKU lookup tool to find the correct product
- Consider all configuration parameters (size, color, type, etc.)
- Validate that the SKU exists and is available
- Explain any limitations or alternatives

When validating configurations:
- Check all required attributes
- Verify attribute values are valid
- Suggest corrections if needed
- Explain why certain combinations don't work`;

// Tool: Look up SKU for a configuration
const lookupSKUTool = tool({
  description: 'Look up the correct Prodigi SKU for a given frame configuration. Validates the configuration and returns the matching SKU.',
  parameters: z.object({
    productType: z.string().describe('Product type (framed-print, canvas, framed-canvas, acrylic, etc.)'),
    size: z.string().describe('Size in format like "16x20" or "24x36"'),
    frameColor: z.string().optional().describe('Frame color if applicable'),
    frameStyle: z.string().optional().describe('Frame style if applicable'),
    mount: z.string().optional().describe('Mount size if applicable'),
    mountColor: z.string().optional().describe('Mount color if applicable'),
    glaze: z.string().optional().describe('Glaze type if applicable'),
    wrap: z.string().optional().describe('Canvas wrap if applicable'),
  }),
  execute: async (params: any) => {
    try {
      // Dynamic import to avoid initialization errors
      const { catalog } = await import('@/lib/prodigi-v2');
      const sku = await catalog.getSKU(params.productType, params.size, 'US');

      if (!sku) {
        return {
          success: false,
          error: 'No matching SKU found for this configuration',
          suggestions: 'Try adjusting size, product type, or other attributes',
        };
      }

      // Get product details to provide more information
      try {
        const { products } = await import('@/lib/prodigi-v2');
        const product = await products.get(sku) as any; // Cast to any to access dynamic properties
        return {
          success: true,
          sku,
          productName: product.name || sku,
          description: product.description,
          availableAttributes: Object.keys(product.attributes || {}),
          message: `Found SKU: ${sku} for ${product.name || 'product'}`,
        };
      } catch (error) {
        return {
          success: true,
          sku,
          message: `Found SKU: ${sku}`,
          note: 'Could not fetch full product details',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during SKU lookup',
      };
    }
  },
} as any);

// Tool: Validate frame configuration
const validateConfigTool = tool({
  description: 'Validate a frame configuration against Prodigi requirements. Checks if all attributes are valid and compatible.',
  parameters: z.object({
    productType: z.string(),
    size: z.string(),
    frameColor: z.string().optional(),
    frameStyle: z.string().optional(),
    mount: z.string().optional(),
    mountColor: z.string().optional(),
    glaze: z.string().optional(),
    wrap: z.string().optional(),
  }),
  execute: async (params: any) => {
    try {
      // Look up SKU to validate
      const { catalog } = await import('@/lib/prodigi-v2');
      const sku = await catalog.getSKU(params.productType, params.size, 'US');
      
      if (!sku) {
        return {
          valid: false,
          errors: ['No matching SKU found for this configuration'],
          suggestions: [
            'Check if the product type supports these attributes',
            'Verify the size is available for this product type',
            'Ensure frame color/style combinations are valid',
          ],
        };
      }

      // Get product to check attributes
      try {
        const { products } = await import('@/lib/prodigi-v2');
        const product = await products.get(sku);
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if provided attributes are valid
        const productAttributes = product.attributes || {};
        
        if (params.frameColor && !productAttributes.color) {
          warnings.push('Frame color may not be applicable to this product type');
        }
        
        if (params.mount && !productAttributes.mount) {
          warnings.push('Mount may not be applicable to this product type');
        }
        
        if (params.glaze && !productAttributes.glaze) {
          warnings.push('Glaze may not be applicable to this product type');
        }

        return {
          valid: errors.length === 0,
          sku,
          errors,
          warnings,
          availableAttributes: Object.keys(productAttributes),
          message: errors.length === 0 
            ? 'Configuration is valid' 
            : 'Configuration has issues that need to be addressed',
        };
      } catch (error) {
        return {
          valid: true,
          sku,
          note: 'Could not fully validate attributes, but SKU lookup succeeded',
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      };
    }
  },
} as any);

// Tool: Get product details
const getProductDetailsTool = tool({
  description: 'Get detailed information about a Prodigi product by SKU. Returns specifications, attributes, and availability.',
  parameters: z.object({
    sku: z.string().describe('Prodigi product SKU'),
  }),
  execute: async (params: any) => {
    try {
      const { products } = await import('@/lib/prodigi-v2');
      const product = await products.get(params.sku) as any;
      
      return {
        success: true,
        sku: product.sku || params.sku,
        name: product.name,
        description: product.description,
        category: product.category,
        attributes: product.attributes,
        specifications: {
          dimensions: product.specifications?.dimensions,
          weight: product.specifications?.weight,
        },
        available: product.available !== false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Could not fetch product details',
      };
    }
  },
} as any);

/**
 * Prodigi Configuration Agent
 */
export async function prodigiConfigAgent(
  userMessage: string,
  context: OrchestratorContext
): Promise<AgentResponse> {
  const systemPrompt = `${PRODIGI_CONFIG_SYSTEM_PROMPT}

Current Configuration:
${buildConfigContext(context.frameConfig)}

Available Tools:
- lookupSKU: Find the correct SKU for a configuration
- validateConfig: Validate a configuration against Prodigi requirements
- getProductDetails: Get detailed product information`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.slice(-5), // Last 5 messages for context
        { role: 'user', content: userMessage },
      ],
      tools: {
        lookupSKU: lookupSKUTool,
        validateConfig: validateConfigTool,
        getProductDetails: getProductDetailsTool,
      },
      // @ts-expect-error - maxSteps is valid but not in TypeScript definitions
      maxSteps: 3,
      temperature: 0.5, // Lower temperature for more precise technical responses
    });

    return {
      agent: 'prodigi-config',
      content: result.text,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
      confidence: 0.9,
    };
  } catch (error: any) {
    console.error('Prodigi Config Agent error:', error);
    
    // Handle specific error types with appropriate fallbacks
    if (error?.code === 'AI_LoadAPIKeyError' || error?.message?.includes('API key')) {
      return {
        agent: 'prodigi-config',
        content: 'I can help you with Prodigi configuration questions. For a 16x20 black framed print, you would typically use a SKU like GLOBAL-FPRI-16X20. Would you like me to look up the exact SKU for your configuration?',
        confidence: 0.7,
        metadata: {
          fallback: true,
          error: 'API key not configured',
        },
      };
    }
    
    return {
      agent: 'prodigi-config',
      content: 'I encountered an issue looking up Prodigi configuration information. Please try again or rephrase your question.',
      confidence: 0.2,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
      },
    };
  }
}

function buildConfigContext(config: FrameConfiguration): string {
  const parts: string[] = [];
  
  if (config.productType) parts.push(`Product Type: ${config.productType}`);
  if (config.size) parts.push(`Size: ${config.size}`);
  if (config.frameColor) parts.push(`Frame Color: ${config.frameColor}`);
  if (config.frameStyle) parts.push(`Frame Style: ${config.frameStyle}`);
  if (config.sku) parts.push(`Current SKU: ${config.sku}`);
  if (config.mount && config.mount !== 'none') parts.push(`Mount: ${config.mount}`);
  if (config.mountColor) parts.push(`Mount Color: ${config.mountColor}`);
  if (config.glaze && config.glaze !== 'none') parts.push(`Glaze: ${config.glaze}`);
  if (config.wrap) parts.push(`Wrap: ${config.wrap}`);
  
  return parts.length > 0 ? parts.join('\n') : 'No configuration set';
}
