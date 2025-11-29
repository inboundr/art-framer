/**
 * Pricing Advisor Agent Node
 * Handles pricing questions, cost optimization, and price comparisons
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredTool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { AgentState } from '../../types';
import { prodigiSDK } from '@/lib/prodigi-v2';
import { estimateDeliveryTime, formatDeliveryEstimate } from '@/lib/prodigi-v2/delivery-estimator';

const PRICING_ADVISOR_SYSTEM_PROMPT = `You are a pricing and cost optimization expert for custom framing with direct access to real Prodigi API pricing.

Your expertise:
- Real-time Prodigi pricing structure and how it works
- Accurate cost breakdowns (product, shipping, taxes) from Prodigi API
- Location-specific pricing (shipping costs vary by country/city)
- Price comparisons between options using real data
- Budget optimization strategies
- Understanding price differences
- Delivery time vs cost trade-offs

Your role:
- Get REAL pricing from Prodigi API using getPriceQuote tool
- Explain pricing clearly and transparently with actual numbers
- Compare prices between different configurations using real data
- Help users optimize costs while maintaining quality
- Explain why certain options cost more
- Suggest budget-friendly alternatives
- Provide accurate cost breakdowns including shipping

IMPORTANT - Always Use Real Pricing:
- When user asks about pricing, shipping costs, or "how much", ALWAYS use getPriceQuote tool
- Extract location from user message (e.g., "Ottawa" = Canada, "Toronto" = Canada, "London" = UK or Canada)
- Use current frame configuration if available, or ask for product type and size
- Provide exact numbers from Prodigi API, not estimates
- Include shipping costs specific to the destination country/city

Guidelines:
1. ALWAYS use getPriceQuote tool for pricing questions - never estimate
2. Extract location information from user messages (city names, country names)
3. Be transparent about pricing with exact numbers from Prodigi
4. Explain cost differences clearly using real data
5. Help users find value within their budget
6. Compare options side-by-side when relevant using real pricing
7. Explain shipping and delivery costs specific to their location
8. Suggest cost-saving strategies when appropriate
9. Never hide or obscure pricing information
10. If pricing API fails, explain the error but don't make up numbers`;

// Tool: Get price quote from Prodigi API
class GetPriceQuoteTool extends StructuredTool {
  name = 'getPriceQuote';
  description = 'Get accurate pricing for a frame configuration using real Prodigi API. Returns cost breakdown including product, shipping, and total. Supports location-specific pricing (e.g., "Ottawa" = Canada). If productType and size are not provided, will use current frame configuration.';

  schema = z.object({
    productType: z.string().optional().describe('Product type: framed-print, canvas, framed-canvas, acrylic, metal, poster. If not provided, uses current configuration.'),
    size: z.string().optional().describe('Size (e.g., "16x20", "24x36"). If not provided, uses current configuration.'),
    frameColor: z.string().optional().describe('Frame color. If not provided, uses current configuration.'),
    frameStyle: z.string().optional().describe('Frame style. If not provided, uses current configuration.'),
    mount: z.string().optional().describe('Mount size. If not provided, uses current configuration.'),
    mountColor: z.string().optional().describe('Mount color. If not provided, uses current configuration.'),
    glaze: z.string().optional().describe('Glaze type. If not provided, uses current configuration.'),
    wrap: z.string().optional().describe('Canvas wrap. If not provided, uses current configuration.'),
    country: z.string().optional().describe('Country code (e.g., "US", "CA", "GB") or country name (e.g., "Canada", "United States"). Defaults to US.'),
    city: z.string().optional().describe('City name (e.g., "Ottawa", "Toronto") - helps determine country if not specified'),
  });

  private frameConfig: any = null;

  setFrameConfig(config: any) {
    this.frameConfig = config;
  }

  async _call(input: z.infer<typeof this.schema>) {
    try {
      // Determine country code from input
      let countryCode = 'US'; // Default
      
      if (input.country) {
        // If country is provided, try to parse it
        const countryUpper = input.country.toUpperCase();
        if (countryUpper.length === 2) {
          // Already a country code
          countryCode = countryUpper;
        } else {
          // Try to map country name to code
          const countryMap: Record<string, string> = {
            'canada': 'CA',
            'united states': 'US',
            'usa': 'US',
            'united kingdom': 'GB',
            'uk': 'GB',
            'australia': 'AU',
            'germany': 'DE',
            'france': 'FR',
            'spain': 'ES',
            'italy': 'IT',
            'netherlands': 'NL',
            'belgium': 'BE',
            'switzerland': 'CH',
            'austria': 'AT',
            'sweden': 'SE',
            'norway': 'NO',
            'denmark': 'DK',
            'finland': 'FI',
            'poland': 'PL',
            'portugal': 'PT',
            'ireland': 'IE',
            'new zealand': 'NZ',
            'japan': 'JP',
            'singapore': 'SG',
            'hong kong': 'HK',
            'mexico': 'MX',
            'brazil': 'BR',
            'argentina': 'AR',
            'chile': 'CL',
            'colombia': 'CO',
            'peru': 'PE',
            'south africa': 'ZA',
            'united arab emirates': 'AE',
            'saudi arabia': 'SA',
            'israel': 'IL',
            'turkey': 'TR',
            'india': 'IN',
            'south korea': 'KR',
            'taiwan': 'TW',
            'thailand': 'TH',
            'malaysia': 'MY',
            'indonesia': 'ID',
            'philippines': 'PH',
            'vietnam': 'VN',
          };
          
          const normalizedCountry = input.country.toLowerCase().trim();
          countryCode = countryMap[normalizedCountry] || 'US';
        }
      } else if (input.city) {
        // If city is provided, try to infer country
        const cityLower = input.city.toLowerCase();
        const canadianCities = ['ottawa', 'toronto', 'vancouver', 'montreal', 'calgary', 'edmonton', 'winnipeg', 'quebec', 'hamilton', 'london', 'kitchener', 'mississauga', 'brampton', 'halifax', 'victoria', 'saskatoon', 'regina', 'st. john\'s', 'st john\'s'];
        if (canadianCities.includes(cityLower)) {
          countryCode = 'CA';
        }
      }

      // Use input values or fall back to current frame configuration
      const productType = input.productType || this.frameConfig?.productType;
      const size = input.size || this.frameConfig?.size;
      const frameColor = input.frameColor || this.frameConfig?.frameColor;
      const frameStyle = input.frameStyle || this.frameConfig?.frameStyle;
      const mount = input.mount !== undefined ? input.mount : (this.frameConfig?.mount || 'none');
      const mountColor = input.mountColor || this.frameConfig?.mountColor;
      const glaze = input.glaze !== undefined ? input.glaze : (this.frameConfig?.glaze || 'none');
      const wrap = input.wrap || this.frameConfig?.wrap;

      if (!productType || !size) {
        return JSON.stringify({
          success: false,
          error: 'Product type and size are required',
          note: 'Please provide product type and size, or ensure frame configuration is set',
        });
      }

      // Get SKU from catalog
      const sku = await prodigiSDK.catalog.getSKU(productType, size, countryCode);
      
      if (!sku) {
        return JSON.stringify({
          success: false,
          error: `No ${productType} available in size ${size} for ${countryCode}`,
          note: 'Product not available in this size',
        });
      }

      // Get product details to determine valid attributes
      const product = await prodigiSDK.products.get(sku);
      if (!product) {
        return JSON.stringify({
          success: false,
          error: `Product ${sku} not found`,
          note: 'Product not found in Prodigi catalog',
        });
      }

      // Build attributes based on what the product supports
      const attributes: Record<string, string> = {};
      const validAttributes = product.attributes || {};

      // Helper to add attribute if valid
      const addIfValid = (key: string, value: any) => {
        if (!value || value === 'none') return;
        if (validAttributes[key]) {
          const validOptions = validAttributes[key];
          const matchingOption = validOptions.find(
            (opt: string) => opt.toLowerCase() === value.toLowerCase()
          );
          if (matchingOption) {
            attributes[key] = matchingOption;
          }
        }
      };

      addIfValid('color', frameColor);
      addIfValid('wrap', wrap);
      addIfValid('glaze', glaze === 'acrylic' ? 'Acrylic / Perspex' : glaze);
      
      if (mount && mount !== 'none') {
        addIfValid('mount', mount);
        addIfValid('mountColor', mountColor);
      }

      // Handle required attributes
      if (attributes.mount && !attributes.mountColor && validAttributes.mountColor) {
        attributes.mountColor = validAttributes.mountColor[0];
      }
      if (!attributes.color && validAttributes.color) {
        attributes.color = validAttributes.color[0];
      }

      // Normalize wrap to lowercase (Prodigi API requirement)
      if (attributes.wrap) {
        attributes.wrap = attributes.wrap.toLowerCase();
      }

      // Build quote request
      const quoteRequest = {
        destinationCountryCode: countryCode,
        shippingMethod: 'Standard' as const,
        items: [
          {
            sku,
            copies: 1,
            ...(Object.keys(attributes).length > 0 && { attributes }),
            assets: [
              {
                printArea: 'default',
              },
            ],
          },
        ],
      };

      // Get real quote from Prodigi
      const quotes = await prodigiSDK.quotes.create(quoteRequest);
      const standardQuote = quotes.find(q => q.shipmentMethod === 'Standard');

      if (!standardQuote) {
        return JSON.stringify({
          success: false,
          error: 'No standard shipping quote available',
          note: 'Could not get shipping quote from Prodigi',
        });
      }

      // Extract pricing information
      const itemsCost = Number(standardQuote.costSummary.items?.amount) || 0;
      const shippingCost = Number(standardQuote.costSummary.shipping?.amount) || 0;
      const totalCost = Number(standardQuote.costSummary.totalCost?.amount) || (itemsCost + shippingCost);
      const currency = standardQuote.costSummary.totalCost?.currency || 'USD';
      const productionCountry = standardQuote.shipments?.[0]?.fulfillmentLocation?.countryCode || 'US';

      // Calculate delivery estimate
      const deliveryEstimate = estimateDeliveryTime(
        productionCountry,
        countryCode,
        standardQuote.shipmentMethod
      );
      const deliveryFormatted = formatDeliveryEstimate(deliveryEstimate);

      return JSON.stringify({
        success: true,
        productType,
        size,
        sku,
        country: countryCode,
        pricing: {
          subtotal: itemsCost,
          shipping: shippingCost,
          total: totalCost,
          currency,
        },
        delivery: {
          estimatedDays: {
            min: deliveryEstimate.totalDays.min,
            max: deliveryEstimate.totalDays.max,
          },
          formatted: deliveryFormatted,
          note: deliveryEstimate.note,
        },
        productionCountry,
        destinationCountry: countryCode,
        note: 'Real-time pricing from Prodigi API',
      });
    } catch (error: any) {
      console.error('Error getting price quote:', error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to get pricing',
        note: 'Could not retrieve pricing from Prodigi API',
      });
    }
  }
}

/**
 * Pricing Advisor Agent Node
 */
export async function pricingAdvisorNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const { userMessage, frameConfig, messages } = state;
    
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const getPriceQuoteTool = new GetPriceQuoteTool();
    // Pass current frame config to tool so it can use it as defaults
    getPriceQuoteTool.setFrameConfig(frameConfig);

    const tools = [
      getPriceQuoteTool,
    ];

    const modelWithTools = model.bindTools(tools);

    const configContext = buildConfigContext(frameConfig || {});
    const systemPrompt = `${PRICING_ADVISOR_SYSTEM_PROMPT}

CURRENT FRAME CONFIGURATION:
${configContext}

When user asks about pricing or shipping:
1. Use getPriceQuote tool with current configuration (or ask for product type/size if not set)
2. Extract location from their message (city names like "Ottawa" = CA, "Toronto" = CA, "London" = GB or CA)
3. Provide exact pricing numbers from Prodigi API
4. Break down subtotal, shipping, and total costs
5. Include delivery estimates when available

Available Tools:
- getPriceQuote: Get REAL pricing from Prodigi API (always use this for pricing questions)`;

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
      
      // Build follow-up messages
      const followUpMessages: any[] = [];
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          if (msg.role === 'user') {
            followUpMessages.push({ role: 'user', content: msg.content });
          } else if (msg.role === 'assistant') {
            followUpMessages.push({ role: 'assistant', content: msg.content });
          }
        });
      }
      followUpMessages.push({ role: 'human', content: userMessage });
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
        'pricing-advisor': {
          agent: 'pricing-advisor',
          content: content || 'Pricing varies by size, product type, and options. A 16x20 framed print typically costs $45-55. Premium options like motheye glazing add $10-20.',
          toolCalls,
          toolResults,
          confidence: 0.85,
        },
      },
    };
  } catch (error: any) {
    console.error('Pricing Advisor Agent error:', error);
    
    return {
      agentResponses: {
        'pricing-advisor': {
          agent: 'pricing-advisor',
          content: 'Pricing varies by size, product type, and options. A 16x20 framed print typically costs $45-55. Premium options like motheye glazing add $10-20.',
          confidence: 0.5,
          metadata: {
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      errors: {
        'pricing-advisor': error,
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

