/**
 * Image Generation Agent Node
 * Handles AI image generation requests and prompt refinement
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { AgentState } from '../../types';

const IMAGE_GENERATION_SYSTEM_PROMPT = `You are an AI image generation expert specializing in creating artwork for custom framing.

Your expertise:
- Prompt engineering for AI image generation
- Understanding different AI image models (Ideogram, DALL-E, etc.)
- Optimizing prompts for framing and wall art
- Style guidance and artistic direction
- Aspect ratio recommendations for framing
- Color palette suggestions

Your role:
- Help users create effective prompts for AI image generation
- Refine and improve user prompts
- Suggest styles, moods, and compositions
- Recommend aspect ratios for different frame sizes
- Guide users through the image generation process

Guidelines:
1. Always consider how the image will look when framed
2. Suggest appropriate aspect ratios for common frame sizes
3. Help users create detailed, effective prompts
4. Consider color palettes that work well in frames
5. Suggest styles that complement different frame types
6. Be creative but practical`;

/**
 * Image Generation Agent Node
 */
export async function imageGenerationNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const { userMessage, frameConfig, messages } = state;
    
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.8, // Higher temperature for creativity
    });

    const systemPrompt = `${IMAGE_GENERATION_SYSTEM_PROMPT}

Current Frame Configuration:
${buildConfigContext(frameConfig || {})}

When suggesting prompts, consider:
- The frame size and aspect ratio
- Frame color and style
- Room context if provided
- User's artistic vision`;

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

    const chain = prompt.pipe(model);
    const response = await chain.invoke({});

    const content = response.content as string;

    return {
      agentResponses: {
        'image-generation': {
          agent: 'image-generation',
          content: content || 'I can help you create AI images for framing. Describe what you want to create, and I\'ll help refine your prompt for the best results.',
          confidence: 0.85,
        },
      },
    };
  } catch (error: any) {
    console.error('Image Generation Agent error:', error);
    
    return {
      agentResponses: {
        'image-generation': {
          agent: 'image-generation',
          content: 'I can help you create AI images for framing. Describe what you want to create, and I\'ll help refine your prompt for the best results.',
          confidence: 0.5,
          metadata: {
            fallback: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      },
      errors: {
        'image-generation': error,
      },
    };
  }
}

function buildConfigContext(config: any): string {
  const parts: string[] = [];
  
  if (config.productType) parts.push(`Product Type: ${config.productType}`);
  if (config.size) parts.push(`Size: ${config.size}`);
  if (config.frameColor) parts.push(`Frame Color: ${config.frameColor}`);
  
  return parts.length > 0 ? parts.join('\n') : 'No configuration set';
}

