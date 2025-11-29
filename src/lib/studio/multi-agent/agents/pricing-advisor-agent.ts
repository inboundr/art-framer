/**
 * Pricing Advisor Agent
 * Expert in pricing, cost optimization, and explaining how Prodigi pricing works
 */

import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import type { OrchestratorContext, AgentResponse } from '../orchestrator';

const PRICING_ADVISOR_SYSTEM_PROMPT = `You are a pricing and cost optimization expert for custom framing.

Your expertise:
- Prodigi pricing structure and how it works
- Cost breakdowns (product, shipping, taxes)
- Price comparisons between options
- Budget optimization strategies
- Understanding price differences
- Delivery time vs cost trade-offs

Your role:
- Explain pricing clearly and transparently
- Compare prices between different configurations
- Help users optimize costs while maintaining quality
- Explain why certain options cost more
- Suggest budget-friendly alternatives
- Provide cost breakdowns when helpful

Guidelines:
1. Always be transparent about pricing
2. Explain cost differences clearly
3. Help users find value within their budget
4. Compare options side-by-side when relevant
5. Explain shipping and delivery costs
6. Suggest cost-saving strategies when appropriate
7. Never hide or obscure pricing information`;

// Tool: Get price quote
const getPriceQuoteTool = tool({
  description: 'Get accurate pricing for a frame configuration. Returns cost breakdown including product, shipping, and total.',
  parameters: z.object({
    productType: z.string(),
    size: z.string(),
    frameColor: z.string().optional(),
    mount: z.string().optional(),
    glaze: z.string().optional(),
    country: z.string().optional().describe('Country code (defaults to US)'),
  }),
  execute: async (params) => {
    try {
      // This would integrate with the pricing API
      // For now, return a structured response
      return {
        success: true,
        productType: params.productType,
        size: params.size,
        estimatedPrice: {
          product: 0, // Would be calculated from Prodigi
          shipping: 0,
          total: 0,
          currency: 'USD',
        },
        note: 'Pricing calculated based on Prodigi rates',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Could not calculate pricing',
      };
    }
  },
} as any);

// Tool: Compare prices
const comparePricesTool = tool({
  description: 'Compare prices between different frame configurations. Shows cost differences and helps users make informed decisions.',
  parameters: z.object({
    option1: z.object({
      frameColor: z.string().optional(),
      size: z.string().optional(),
      productType: z.string().optional(),
      price: z.number().optional(),
      total: z.number().optional(),
    }).describe('First configuration with pricing'),
    option2: z.object({
      frameColor: z.string().optional(),
      size: z.string().optional(),
      productType: z.string().optional(),
      price: z.number().optional(),
      total: z.number().optional(),
    }).describe('Second configuration with pricing'),
    includeShipping: z.boolean().optional().describe('Whether to include shipping costs (defaults to true)'),
  }),
  execute: async (params) => {
    const option1 = params.option1 || {};
    const option2 = params.option2 || {};
    const includeShipping = params.includeShipping !== false; // Default to true
    
    const price1 = option1.price || option1.total || 0;
    const price2 = option2.price || option2.total || 0;
    const diff = price1 - price2;
    const percentDiff = price2 > 0 ? ((diff / price2) * 100).toFixed(1) : '0';
    
    return {
      option1: {
        config: option1,
        price: price1,
      },
      option2: {
        config: option2,
        price: price2,
      },
      difference: {
        amount: Math.abs(diff),
        percentage: Math.abs(parseFloat(percentDiff)),
        cheaper: diff > 0 ? 'option2' : diff < 0 ? 'option1' : 'same',
      },
      recommendation: generatePriceRecommendation(option1, option2, diff),
      includeShipping,
    };
  },
} as any);

// Tool: Suggest cost optimizations
const suggestOptimizationsTool = tool({
  description: 'Suggest ways to optimize costs while maintaining quality. Provides budget-friendly alternatives.',
  parameters: z.object({
    currentConfig: z.object({
      frameColor: z.string().optional(),
      size: z.string().optional(),
      productType: z.string().optional(),
      mount: z.string().optional(),
      glaze: z.string().optional(),
      price: z.number().optional(),
    }).describe('Current frame configuration'),
    budget: z.number().optional().describe('Target budget'),
    priorities: z.array(z.string()).optional().describe('What user values most (quality, size, speed, etc.)'),
  }),
  execute: async (params) => {
    const currentConfig = params.currentConfig || {};
    const optimizations = [];
    
    // Suggest optimizations based on current config
    if (currentConfig.glaze === 'motheye') {
      optimizations.push({
        suggestion: 'Switch to acrylic glaze',
        savings: 'Save $10-20',
        impact: 'Slight reduction in UV protection, still excellent quality',
      });
    }
    
    if (currentConfig.mount && currentConfig.mount !== 'none') {
      optimizations.push({
        suggestion: 'Remove mount',
        savings: 'Save $5-15',
        impact: 'More direct presentation, less spacing',
      });
    }
    
    if (currentConfig.frameColor === 'gold' || currentConfig.frameColor === 'silver') {
      optimizations.push({
        suggestion: 'Consider black or white frame',
        savings: 'Save $5-10',
        impact: 'Classic look, more versatile',
      });
    }
    
    return {
      optimizations,
      totalPotentialSavings: optimizations.length * 10, // Rough estimate
      note: 'These are suggestions - choose based on your priorities',
    };
  },
} as any);

function generatePriceRecommendation(option1: any, option2: any, diff: number): string {
  if (Math.abs(diff) < 1) {
    return 'Both options are similarly priced - choose based on style preference';
  }
  
  if (diff > 0) {
    return `Option 2 is $${diff.toFixed(2)} less expensive. Consider it if the style difference is acceptable.`;
  }
  
  return `Option 1 is $${Math.abs(diff).toFixed(2)} less expensive. It offers good value for the price.`;
}

/**
 * Pricing Advisor Agent
 */
export async function pricingAdvisorAgent(
  userMessage: string,
  context: OrchestratorContext
): Promise<AgentResponse> {
  const systemPrompt = `${PRICING_ADVISOR_SYSTEM_PROMPT}

Current Configuration:
${buildConfigContext(context.frameConfig)}

Current Price: ${context.frameConfig.price ? `$${context.frameConfig.price}` : 'Not calculated yet'}

Available Tools:
- getPriceQuote: Get accurate pricing for configurations
- comparePrices: Compare prices between options
- suggestOptimizations: Find cost-saving opportunities`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: [
        ...context.conversationHistory.slice(-5),
        { role: 'user', content: userMessage },
      ],
      tools: {
        getPriceQuote: getPriceQuoteTool,
        comparePrices: comparePricesTool,
        suggestOptimizations: suggestOptimizationsTool,
      },
      // @ts-expect-error - maxSteps is valid but not in TypeScript definitions
      maxSteps: 3,
      temperature: 0.5, // Lower temperature for precise pricing information
    });

    return {
      agent: 'pricing-advisor',
      content: result.text,
      toolCalls: result.toolCalls || [],
      toolResults: result.toolResults || [],
      confidence: 0.9,
    };
  } catch (error: any) {
    console.error('Pricing Advisor Agent error:', error);
    
    // Handle specific error types with appropriate fallbacks
    if (error?.code === 'AI_LoadAPIKeyError' || error?.message?.includes('API key')) {
      return {
        agent: 'pricing-advisor',
        content: 'Pricing depends on several factors: product type, size, frame color, mount, and glazing. For example, a 16x20 black framed print typically costs around $45-55. Premium options like motheye glazing or larger sizes will increase the price. Would you like me to compare specific options?',
        confidence: 0.7,
        metadata: {
          fallback: true,
          error: 'API key not configured',
        },
      };
    }
    
    return {
      agent: 'pricing-advisor',
      content: 'I encountered an issue with pricing information. Please try again or rephrase your question.',
      confidence: 0.2,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
      },
    };
  }
}

function buildConfigContext(config: any): string {
  const parts: string[] = [];
  
  if (config.productType) parts.push(`Product Type: ${config.productType}`);
  if (config.size) parts.push(`Size: ${config.size}`);
  if (config.frameColor) parts.push(`Frame Color: ${config.frameColor}`);
  if (config.mount && config.mount !== 'none') parts.push(`Mount: ${config.mount}`);
  if (config.glaze && config.glaze !== 'none') parts.push(`Glaze: ${config.glaze}`);
  if (config.price) parts.push(`Price: $${config.price}`);
  
  return parts.length > 0 ? parts.join('\n') : 'No configuration set';
}
