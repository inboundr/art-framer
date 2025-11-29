/**
 * Prodigi Configuration Agent Node
 * Handles Prodigi API, SKU lookup, frame configurations, and technical details
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredTool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { AgentState } from '../../types';

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
6. Be proactive in catching configuration errors`;

// Tool: Look up SKU
class LookupSKUTool extends StructuredTool {
  name = 'lookupSKU';
  description = 'Look up the correct Prodigi SKU for a given frame configuration. Validates the configuration and returns the matching SKU.';

  schema = z.object({
    productType: z.string().describe('Product type (framed-print, canvas, framed-canvas, acrylic, etc.)'),
    size: z.string().describe('Size in format like "16x20" or "24x36"'),
    frameColor: z.string().optional().describe('Frame color if applicable'),
    frameStyle: z.string().optional().describe('Frame style if applicable'),
    mount: z.string().optional().describe('Mount size if applicable'),
    mountColor: z.string().optional().describe('Mount color if applicable'),
    glaze: z.string().optional().describe('Glaze type if applicable'),
    wrap: z.string().optional().describe('Canvas wrap if applicable'),
  });

  async _call(input: z.infer<typeof this.schema>) {
    try {
      const { catalog } = await import('@/lib/prodigi-v2');
      const sku = await catalog.getSKU(input.productType, input.size, 'US');

      if (!sku) {
        return JSON.stringify({
          success: false,
          error: 'No matching SKU found for this configuration',
          suggestions: 'Try adjusting size, product type, or other attributes',
        });
      }

      // Get product details
      try {
        const { products } = await import('@/lib/prodigi-v2');
        const product = await products.get(sku) as any;
        return JSON.stringify({
          success: true,
          sku,
          productName: product.name || sku,
          description: product.description,
          availableAttributes: Object.keys(product.attributes || {}),
          message: `Found SKU: ${sku} for ${product.name || 'product'}`,
        });
      } catch (error) {
        return JSON.stringify({
          success: true,
          sku,
          message: `Found SKU: ${sku}`,
          note: 'Could not fetch full product details',
        });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during SKU lookup',
      });
    }
  }
}

// Tool: Validate configuration
class ValidateConfigTool extends StructuredTool {
  name = 'validateConfig';
  description = 'Validate a frame configuration against Prodigi requirements. Checks if all attributes are valid and compatible.';

  schema = z.object({
    productType: z.string(),
    size: z.string(),
    frameColor: z.string().optional(),
    frameStyle: z.string().optional(),
    mount: z.string().optional(),
    mountColor: z.string().optional(),
    glaze: z.string().optional(),
    wrap: z.string().optional(),
  });

  async _call(input: z.infer<typeof this.schema>) {
    try {
      const { catalog } = await import('@/lib/prodigi-v2');
      const sku = await catalog.getSKU(input.productType, input.size, 'US');
      
      if (!sku) {
        return JSON.stringify({
          valid: false,
          errors: ['No matching SKU found for this configuration'],
          suggestions: [
            'Check if the product type supports these attributes',
            'Verify the size is available for this product type',
            'Ensure frame color/style combinations are valid',
          ],
        });
      }

      // Get product to check attributes
      try {
        const { products } = await import('@/lib/prodigi-v2');
        const product = await products.get(sku);
        const errors: string[] = [];
        const warnings: string[] = [];

        const productAttributes = product.attributes || {};
        
        if (input.frameColor && !productAttributes.color) {
          warnings.push('Frame color may not be applicable to this product type');
        }
        
        if (input.mount && !productAttributes.mount) {
          warnings.push('Mount may not be applicable to this product type');
        }
        
        if (input.glaze && !productAttributes.glaze) {
          warnings.push('Glaze may not be applicable to this product type');
        }

        return JSON.stringify({
          valid: errors.length === 0,
          sku,
          errors,
          warnings,
          availableAttributes: Object.keys(productAttributes),
          message: errors.length === 0 
            ? 'Configuration is valid' 
            : 'Configuration has issues that need to be addressed',
        });
      } catch (error) {
        return JSON.stringify({
          valid: true,
          sku,
          note: 'Could not fully validate attributes, but SKU lookup succeeded',
        });
      }
    } catch (error) {
      return JSON.stringify({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      });
    }
  }
}

/**
 * Prodigi Configuration Agent Node
 */
export async function prodigiConfigNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const { userMessage, frameConfig, messages } = state;
    
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const tools = [
      new LookupSKUTool(),
      new ValidateConfigTool(),
    ];

    const modelWithTools = model.bindTools(tools);

    const systemPrompt = `${PRODIGI_CONFIG_SYSTEM_PROMPT}

Current Configuration:
${buildConfigContext(frameConfig || {})}

Available Tools:
- lookupSKU: Find the correct SKU for a configuration
- validateConfig: Validate a configuration against Prodigi requirements`;

    // Build messages array for LangChain
    const langchainMessages: any[] = [
      ['system', systemPrompt],
    ];
    
    // Add conversation history
    if (messages && messages.length > 0) {
      messages.forEach(msg => {
        if (msg.role === 'user') {
          langchainMessages.push(['human', msg.content]);
        } else if (msg.role === 'assistant') {
          langchainMessages.push(['assistant', msg.content]);
        }
      });
    }
    
    // Add current user message
    langchainMessages.push(['human', userMessage]);

    const prompt = ChatPromptTemplate.fromMessages(langchainMessages);

    const chain = prompt.pipe(modelWithTools);
    const response = await chain.invoke({});

    // Extract tool calls and results
    const toolCalls: any[] = [];
    const toolResults: any[] = [];

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        toolCalls.push(toolCall);
        
        const tool = tools.find(t => t.name === toolCall.name);
        if (tool) {
          try {
            const result = await tool.invoke(toolCall.args);
            toolResults.push({
              toolName: toolCall.name,
              result: JSON.parse(result),
            });
          } catch (error) {
            console.error(`Error executing tool ${toolCall.name}:`, error);
          }
        }
      }
    }

    // Get final response text
    let content = response.content as string;
    if (!content && response.tool_calls && response.tool_calls.length > 0) {
      const followUpModel = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0.7,
      });
      
      // Build follow-up messages with proper LangChain message types
      const followUpMessages: any[] = [];
      
      // Add conversation history
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'human') {
            followUpMessages.push({ role: 'human', content: msg.content });
          } else if (msg.role === 'assistant') {
            followUpMessages.push({ role: 'assistant', content: msg.content });
          }
        });
      }
      
      // Add current user message
      followUpMessages.push({ role: 'human', content: userMessage });
      
      // Add the assistant message with tool calls
      followUpMessages.push(response);
      
      // Add tool result messages (proper LangChain ToolMessage format)
      toolResults.forEach((tr, index) => {
        const toolCall = response.tool_calls?.[index];
        if (toolCall && toolCall.id) {
          followUpMessages.push(
            new ToolMessage({
              content: JSON.stringify(tr.result),
              tool_call_id: toolCall.id,
            })
          );
        }
      });
      
      // Get final response
      const followUpResponse = await followUpModel.invoke(followUpMessages);
      content = followUpResponse.content as string;
    }

    return {
      agentResponses: {
        'prodigi-config': {
          agent: 'prodigi-config',
          content: content || 'I can help with Prodigi configuration. What would you like to know?',
          toolCalls,
          toolResults,
          confidence: 0.9,
        },
      },
    };
  } catch (error: any) {
    console.error('Prodigi Config Agent error:', error);
    
    return {
      agentResponses: {
        'prodigi-config': {
          agent: 'prodigi-config',
          content: 'I can help with Prodigi configuration. For technical questions about SKUs and product attributes, please check the product catalog or contact support.',
          confidence: 0.5,
          metadata: {
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      errors: {
        'prodigi-config': error,
      },
    };
  }
}

function buildConfigContext(config: any): string {
  const parts: string[] = [];
  
  if (config.productType) parts.push(`Product Type: ${config.productType}`);
  if (config.size) parts.push(`Size: ${config.size}`);
  if (config.frameColor) parts.push(`Frame Color: ${config.frameColor}`);
  if (config.frameStyle) parts.push(`Frame Style: ${config.frameStyle}`);
  if (config.mount && config.mount !== 'none') parts.push(`Mount: ${config.mount}`);
  if (config.glaze && config.glaze !== 'none') parts.push(`Glaze: ${config.glaze}`);
  
  return parts.length > 0 ? parts.join('\n') : 'No configuration set';
}

