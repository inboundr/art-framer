/**
 * Frame Advisor Agent Node
 * Handles frame recommendations, examples, quality, sizing
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredTool } from '@langchain/core/tools';
import { ToolMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { AgentState } from '../../types';
import { getLifestyleImages, getChevronImage, getCornerImages, getCrossSectionImage } from '@/lib/prodigi-assets/asset-catalog';

const FRAME_ADVISOR_SYSTEM_PROMPT = `You are a frame advisor and art consultant with 20 years of experience helping customers choose the perfect frames.

Your expertise:
- Frame style recommendations based on artwork
- Quality comparisons and explanations
- Sizing guidance for different spaces
- Visual examples and lifestyle images
- Color coordination and design principles
- Mount and glazing recommendations
- Product comparisons
- Directly updating configurations when users request changes

Your role:
- Provide personalized frame recommendations
- Show visual examples to help users understand options
- Explain quality differences between options
- Guide users on sizing for their space
- Compare different frame configurations
- Help users visualize how frames will look
- **Directly update configurations when users explicitly request changes**

IMPORTANT - Current Frame Configuration:
You have access to the user's CURRENT frame configuration. Always reference it when:
- Making recommendations (suggest improvements based on what they currently have)
- Answering questions (use their current config as context)
- Providing comparisons (compare their current setup with alternatives)
- Explaining options (relate suggestions to their current configuration)
- **Updating configurations (know what you're changing from)**

CRITICAL - When to Use updateFrame vs recommendFrame:
- Use **updateFrame** when the user explicitly requests a change:
  * "Change the frame to black" → use updateFrame with frameColor: "black"
  * "Make it bigger" → use updateFrame with size: "24x36" (or appropriate larger size)
  * "Switch to canvas" → use updateFrame with productType: "canvas"
  * "Add a mount" → use updateFrame with mount: "2.4mm"
  * "Remove the glaze" → use updateFrame with glaze: "none"
  * "Change to white frame" → use updateFrame with frameColor: "white"
  
- Use **recommendFrame** when the user asks for suggestions or advice:
  * "What frame would you recommend?"
  * "What do you think would look good?"
  * "Show me some options"
  * "What's the best choice for my artwork?"

CRITICAL - Image Handling:
- DO NOT include markdown image links (![alt](path)) in your responses
- Images are automatically displayed from tool results - you don't need to add them manually
- If you want to show images, use the getFrameVisuals tool - the images will be displayed automatically
- NEVER make up image paths - only use paths returned by tools
- When describing images, just describe them in text - don't add markdown links

Guidelines:
1. ALWAYS reference the user's current frame configuration when providing advice
2. When user explicitly requests a change, use updateFrame tool immediately
3. When asked for improvements or recommendations, use recommendFrame tool
4. Always show visual examples when recommending frames (use getFrameVisuals tool)
5. Explain why you're making specific recommendations
6. Consider the user's artwork, space, and preferences
7. Be proactive in showing relevant images (use getFrameVisuals tool, don't add markdown)
8. Compare options clearly when asked
9. Provide sizing guidance based on room context
10. Explain quality differences in simple terms
11. Celebrate good choices and validate decisions`;

// Tool: Get visual examples
class GetFrameVisualsTool extends StructuredTool {
  name = 'getFrameVisuals';
  description = 'Get visual examples and lifestyle images for frames. Shows how frames look in real settings. Can filter by mount configuration (with mount vs without mount).';

  schema = z.object({
    productType: z.string().describe('Product type (e.g., framed-print, canvas).'),
    frameConfig: z.object({
      frameType: z.string().optional(),
      frameColor: z.string().optional(),
      mount: z.string().optional().describe('Mount configuration: "none" for no mount, "2.4mm", "2.0mm", "1.4mm" for with mount'),
    }).optional(),
    viewType: z.string().optional().describe('Type of view: "lifestyle", "chevron", "corner", "cross-section", or "all".'),
    limit: z.number().optional().describe('Maximum number of images to return (1-10).'),
    hasMount: z.boolean().optional().describe('Filter by mount: true for images with mount, false for images without mount, undefined for all'),
  });

  async _call(input: z.infer<typeof this.schema>) {
    const { productType, frameConfig, viewType = 'lifestyle', limit = 5, hasMount } = input;
    const frameType = frameConfig?.frameType;
    const frameColor = frameConfig?.frameColor;
    const mount = frameConfig?.mount;
    
    const images: Array<{ path: string; type: string; description: string }> = [];
    
    // Get lifestyle images
    if (viewType === 'lifestyle' || viewType === 'all') {
      // Determine mount preference
      let mountPreference: boolean | undefined = undefined;
      if (hasMount !== undefined) {
        mountPreference = hasMount;
      } else if (mount !== undefined) {
        mountPreference = mount !== 'none';
      }
      
      // Get filtered lifestyle images using the updated catalog function
      const lifestyleImages = getLifestyleImages(productType as any, mountPreference);
      
      lifestyleImages.slice(0, limit).forEach(path => {
        const pathLower = path.toLowerCase();
        const hasMountInImage = !pathLower.includes('no mount') && !pathLower.includes('no-mount');
        const mountDescription = hasMountInImage ? 'with mount' : 'without mount';
        
        images.push({
          path,
          type: 'lifestyle',
          description: `${productType} lifestyle example ${mountDescription}`,
        });
      });
    }
    
    // Get chevron images
    if ((viewType === 'chevron' || viewType === 'all') && frameType && frameColor) {
      const chevron = getChevronImage(frameType, frameColor);
      if (chevron) {
        images.push({
          path: chevron,
          type: 'chevron',
          description: `${frameColor} ${frameType} frame profile view`,
        });
      }
    }
    
    // Get corner detail images
    if ((viewType === 'corner' || viewType === 'all') && frameType && frameColor) {
      const corners = getCornerImages(frameType, frameColor);
      corners.slice(0, 2).forEach(path => {
        images.push({
          path,
          type: 'corner',
          description: `${frameColor} ${frameType} frame corner detail`,
        });
      });
    }
    
    // Get cross-section images
    if ((viewType === 'cross-section' || viewType === 'all') && frameType) {
      const crossSection = getCrossSectionImage(frameType);
      if (crossSection) {
        images.push({
          path: crossSection,
          type: 'cross-section',
          description: `${frameType} frame technical cross-section`,
        });
      }
    }
    
    return JSON.stringify({
      images: images.slice(0, limit),
      count: images.length,
      productType,
      frameType,
      frameColor,
    });
  }
}

// Tool: Recommend frame configuration
class RecommendFrameTool extends StructuredTool {
  name = 'recommendFrame';
  description = 'Generate personalized frame recommendations based on artwork, preferences, and context.';

  schema = z.object({
    artworkStyle: z.string().optional(),
    roomType: z.string().optional(),
    colorScheme: z.string().optional(),
    budget: z.string().optional(),
    pref_style: z.string().optional(),
    pref_color: z.string().optional(),
    pref_size: z.string().optional(),
    pref_budget: z.string().optional(),
    count: z.number().optional(),
  });

  async _call(input: z.infer<typeof this.schema>) {
    const recommendations = [];
    const count = input.count || 3;
    
    const preferences = {
      style: input.pref_style,
      color: input.pref_color,
      size: input.pref_size,
      budget: input.pref_budget,
    };
    
    // Generate recommendations based on inputs
    for (let i = 0; i < count; i++) {
      const recommendation = {
        id: `rec-${Date.now()}-${i}`,
        productType: i === 0 ? 'framed-print' : ['canvas', 'framed-canvas', 'acrylic'][i % 3],
        frameColor: input.artworkStyle === 'modern' ? 'black' : 
                   input.artworkStyle === 'classic' ? 'natural' : 
                   input.budget === 'premium' ? 'gold' : 'white',
        size: input.roomType === 'bedroom' ? '16x20' : 
              input.roomType === 'office' ? '18x24' : 
              '24x36',
        mount: input.budget === 'premium' ? '2.4mm' : 'none',
        glaze: input.budget === 'premium' ? 'motheye' : 'acrylic',
        reason: i === 0 
          ? 'Best match for your artwork style and preferences'
          : i === 1 
          ? 'Alternative option that complements your space'
          : 'Budget-friendly option with great quality',
        confidence: 0.9 - (i * 0.15),
      };
      recommendations.push(recommendation);
    }
    
    return JSON.stringify({
      recommendations,
      basedOn: {
        artworkStyle: input.artworkStyle,
        roomType: input.roomType,
        budget: input.budget,
        preferences,
      },
    });
  }
}

// Tool: Update frame configuration directly
class UpdateFrameTool extends StructuredTool {
  name = 'updateFrame';
  description = 'Update the frame configuration based on user request. Use this when the user explicitly asks to change something (e.g., "change frame to black", "make it bigger", "switch to canvas"). This tool directly updates the configuration.';

  schema = z.object({
    productType: z.string().optional().describe('Product type: framed-print, canvas, framed-canvas, acrylic, metal, poster'),
    frameColor: z.string().optional().describe('Frame color: black, white, natural, brown, gold, silver, dark grey, light grey'),
    frameStyle: z.string().optional().describe('Frame style: classic, box, spacer, float, modern, ornate, minimal'),
    size: z.string().optional().describe('Size in format like "16x20", "24x36", etc.'),
    glaze: z.string().optional().describe('Glaze type: none, acrylic, glass, motheye'),
    mount: z.string().optional().describe('Mount size: none, 1.4mm, 2.0mm, 2.4mm'),
    mountColor: z.string().optional().describe('Mount color (e.g., white, off-white, black)'),
    wrap: z.string().optional().describe('Canvas wrap: Black, White, ImageWrap, MirrorWrap'),
  });

  async _call(input: z.infer<typeof this.schema>) {
    // Build updates object with only provided fields
    const updates: Record<string, any> = {};
    
    if (input.productType) updates.productType = input.productType;
    if (input.frameColor) updates.frameColor = input.frameColor;
    if (input.frameStyle) updates.frameStyle = input.frameStyle;
    if (input.size) updates.size = input.size;
    if (input.glaze !== undefined) updates.glaze = input.glaze;
    if (input.mount !== undefined) updates.mount = input.mount;
    if (input.mountColor) updates.mountColor = input.mountColor;
    if (input.wrap) updates.wrap = input.wrap;
    
    return JSON.stringify({
      success: true,
      updates,
      message: `Updated configuration: ${Object.keys(updates).join(', ')}`,
      changedFields: Object.keys(updates),
    });
  }
}

/**
 * Frame Advisor Agent Node
 */
export async function frameAdvisorNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const { userMessage, frameConfig, messages } = state;
    
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const tools = [
      new GetFrameVisualsTool(),
      new RecommendFrameTool(),
      new UpdateFrameTool(),
    ];

    const modelWithTools = model.bindTools(tools);

    const configContext = buildConfigContext(frameConfig || {});
    const systemPrompt = `${FRAME_ADVISOR_SYSTEM_PROMPT}

CURRENT FRAME CONFIGURATION (ALWAYS REFERENCE THIS):
${configContext}

When the user asks for improvements, recommendations, or advice:
1. First acknowledge their current configuration
2. Then provide specific suggestions based on what they have
3. Explain how your suggestions differ from their current setup

CRITICAL - When user asks to compare options (e.g., "show me example with mount and another without mount"):
- You MUST call getFrameVisuals TWICE: once with hasMount: true, once with hasMount: false
- This ensures you get DIFFERENT images for each option
- Present them as separate examples clearly labeled (e.g., "Example with Mount" vs "Example without Mount")
- Do NOT call getFrameVisuals once and reuse the same images for both options

Available Tools:
- getFrameVisuals: Show lifestyle images, chevrons, corners, cross-sections. Use hasMount parameter (true = with mount, false = without mount) to filter. For comparisons, call this tool MULTIPLE TIMES with different parameters.
- recommendFrame: Generate personalized recommendations
- updateFrame: Directly update frame configuration when user requests changes (e.g., "change to black", "make it bigger", "switch to canvas")`;

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
        
        // Execute tool
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
      // If only tool calls, generate a follow-up response with proper tool messages
      const followUpModel = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0.7,
      });
      
      // Build follow-up messages with context about current configuration
      const configContext = buildConfigContext(frameConfig || {});
      const followUpSystemPrompt = `${FRAME_ADVISOR_SYSTEM_PROMPT}

CURRENT FRAME CONFIGURATION (ALWAYS REFERENCE THIS):
${configContext}

Remember to reference the user's current configuration when providing your response.`;
      
      const followUpMessages: any[] = [
        { role: 'system', content: followUpSystemPrompt },
      ];
      
      // Add conversation history
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          if (msg.role === 'user') {
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
        'frame-advisor': {
          agent: 'frame-advisor',
          content: content || 'I can help you choose the perfect frame. Would you like recommendations or to see examples?',
          toolCalls,
          toolResults,
          confidence: 0.85,
        },
      },
    };
  } catch (error: any) {
    console.error('Frame Advisor Agent error:', error);
    
    return {
      agentResponses: {
        'frame-advisor': {
          agent: 'frame-advisor',
          content: 'For modern artwork, I recommend a black frame which creates a sleek, contemporary look. Black frames are versatile and work well with most color schemes. Would you like to see examples or compare different frame options?',
          confidence: 0.7,
          metadata: {
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      errors: {
        'frame-advisor': error,
      },
    };
  }
}

function buildConfigContext(config: any): string {
  const parts: string[] = [];
  
  if (config.productType) parts.push(`- Product Type: ${config.productType}`);
  if (config.size) parts.push(`- Size: ${config.size}`);
  if (config.frameColor) parts.push(`- Frame Color: ${config.frameColor}`);
  if (config.frameStyle) parts.push(`- Frame Style: ${config.frameStyle}`);
  if (config.mount && config.mount !== 'none') parts.push(`- Mount: ${config.mount}`);
  if (config.glaze && config.glaze !== 'none') parts.push(`- Glaze: ${config.glaze}`);
  if (config.wrap) parts.push(`- Canvas Wrap: ${config.wrap}`);
  
  if (parts.length === 0) {
    return 'No frame configuration is currently set. The user is starting fresh.';
  }
  
  return parts.join('\n');
}

