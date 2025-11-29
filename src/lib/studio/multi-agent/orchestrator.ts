/**
 * Multi-Agent Orchestrator
 * Routes user requests to specialized agents and coordinates their responses
 */

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { FrameConfiguration } from '@/store/studio';
import { prodigiConfigAgent } from './agents/prodigi-config-agent';
import { frameAdvisorAgent } from './agents/frame-advisor-agent';
import { imageGenerationAgent } from './agents/image-generation-agent';
import { pricingAdvisorAgent } from './agents/pricing-advisor-agent';

export interface AgentResponse {
  agent: string;
  content: string;
  toolCalls?: any[];
  toolResults?: any[];
  metadata?: Record<string, any>;
  confidence?: number;
}

export interface OrchestratorContext {
  frameConfig: FrameConfiguration;
  imageAnalysis?: any;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userIntent?: string;
}

/**
 * Main orchestrator that routes requests to appropriate agents
 */
export async function routeToAgents(
  userMessage: string,
  context: OrchestratorContext
): Promise<AgentResponse[]> {
  // First, determine which agents should handle this request
  const agentSelection = await selectAgents(userMessage, context);
  
  // Execute agents in parallel or sequence based on priority
  const agentPromises = agentSelection.map(async (agentName) => {
    try {
      return await executeAgent(agentName, userMessage, context);
    } catch (error: any) {
      console.error(`Error executing agent ${agentName}:`, error);
      
      // Enhanced fallback with context-aware responses
      const fallback = createFallbackResponse(agentName, error);
      
      // Add helpful context based on agent type
      if (agentName === 'prodigi-config') {
        fallback.content = 'I can help with Prodigi configuration. For technical questions about SKUs and product attributes, please check the product catalog or contact support.';
      } else if (agentName === 'frame-advisor') {
        fallback.content = 'I recommend black frames for modern artwork, white for gallery-style looks, and natural wood for warm, classic aesthetics. Would you like more specific recommendations?';
      } else if (agentName === 'pricing-advisor') {
        fallback.content = 'Pricing varies by size, product type, and options. A 16x20 framed print typically costs $45-55. Premium options like motheye glazing add $10-20.';
      } else if (agentName === 'image-generation') {
        fallback.content = 'I can help you create AI images for framing. Describe what you want to create, and I\'ll help refine your prompt for the best results.';
      }
      
      return fallback;
    }
  });

  const responses = await Promise.allSettled(agentPromises);
  
  // Process results and combine responses
  const agentResponses: AgentResponse[] = [];
  for (const result of responses) {
    if (result.status === 'fulfilled') {
      agentResponses.push(result.value);
    } else {
      console.error('Agent execution failed:', result.reason);
      // Add fallback response
      agentResponses.push({
        agent: 'orchestrator',
        content: 'I encountered an issue processing your request. Let me help you in a different way.',
        confidence: 0.3,
      });
    }
  }

  return agentResponses;
}

/**
 * Select which agents should handle the request
 */
async function selectAgents(
  userMessage: string,
  context: OrchestratorContext
): Promise<string[]> {
  const lowerMessage = userMessage.toLowerCase();
  const selectedAgents: string[] = [];

  // Prodigi Config Agent - for technical configuration, SKU, API questions
  if (
    lowerMessage.includes('sku') ||
    lowerMessage.includes('product code') ||
    lowerMessage.includes('configuration') ||
    lowerMessage.includes('prodigi') ||
    lowerMessage.includes('api') ||
    lowerMessage.includes('technical') ||
    lowerMessage.includes('attribute') ||
    lowerMessage.includes('frame type') ||
    lowerMessage.includes('product type')
  ) {
    selectedAgents.push('prodigi-config');
  }

  // Frame Advisor Agent - for recommendations, examples, quality, sizing
  if (
    lowerMessage.includes('recommend') ||
    lowerMessage.includes('suggest') ||
    lowerMessage.includes('example') ||
    lowerMessage.includes('show me') ||
    lowerMessage.includes('what') ||
    lowerMessage.includes('which') ||
    lowerMessage.includes('quality') ||
    lowerMessage.includes('size') ||
    lowerMessage.includes('sizing') ||
    lowerMessage.includes('frame color') ||
    lowerMessage.includes('mount') ||
    lowerMessage.includes('glaze') ||
    lowerMessage.includes('compare') ||
    lowerMessage.includes('difference') ||
    lowerMessage.includes('better') ||
    lowerMessage.includes('best')
  ) {
    selectedAgents.push('frame-advisor');
  }

  // Image Generation Agent - for AI image generation requests
  if (
    lowerMessage.includes('generate') ||
    lowerMessage.includes('create') ||
    lowerMessage.includes('make an image') ||
    lowerMessage.includes('ai image') ||
    lowerMessage.includes('ideogram') ||
    lowerMessage.includes('artificial') ||
    lowerMessage.includes('ai art') ||
    lowerMessage.includes('generate image')
  ) {
    selectedAgents.push('image-generation');
  }

  // Pricing Advisor Agent - for pricing questions, cost optimization
  if (
    lowerMessage.includes('price') ||
    lowerMessage.includes('cost') ||
    lowerMessage.includes('expensive') ||
    lowerMessage.includes('cheap') ||
    lowerMessage.includes('budget') ||
    lowerMessage.includes('affordable') ||
    lowerMessage.includes('how much') ||
    lowerMessage.includes('pricing') ||
    lowerMessage.includes('save money') ||
    lowerMessage.includes('discount')
  ) {
    selectedAgents.push('pricing-advisor');
  }

  // If no specific agent matches, default to frame advisor
  if (selectedAgents.length === 0) {
    selectedAgents.push('frame-advisor');
  }

  // Always include frame advisor for general guidance
  if (!selectedAgents.includes('frame-advisor') && selectedAgents.length < 2) {
    selectedAgents.push('frame-advisor');
  }

  return selectedAgents;
}

/**
 * Execute a specific agent
 */
async function executeAgent(
  agentName: string,
  userMessage: string,
  context: OrchestratorContext
): Promise<AgentResponse> {
  switch (agentName) {
    case 'prodigi-config':
      return await prodigiConfigAgent(userMessage, context);
    case 'frame-advisor':
      return await frameAdvisorAgent(userMessage, context);
    case 'image-generation':
      return await imageGenerationAgent(userMessage, context);
    case 'pricing-advisor':
      return await pricingAdvisorAgent(userMessage, context);
    default:
      return await frameAdvisorAgent(userMessage, context);
  }
}

/**
 * Create fallback response when agent fails
 */
function createFallbackResponse(agentName: string, error: any): AgentResponse {
  // Context-aware fallback messages based on agent type
  const fallbackMessages: Record<string, string> = {
    'prodigi-config': 'I can help with Prodigi configuration questions. Please provide your product type and size, and I\'ll assist with SKU lookup and validation.',
    'frame-advisor': 'I recommend black frames for modern artwork, white for gallery-style looks, and natural wood for warm aesthetics. Would you like specific recommendations?',
    'pricing-advisor': 'Pricing depends on size, product type, and options. A typical 16x20 framed print costs $45-55. Premium options add $10-20.',
    'image-generation': 'I can help you create AI images for framing. Describe what you want, and I\'ll help refine your prompt.',
    'orchestrator': 'I\'m here to help with your framing needs. Could you rephrase your question?',
  };
  
  return {
    agent: agentName,
    content: fallbackMessages[agentName] || `I'm having trouble with that request right now. Could you try rephrasing your question?`,
    confidence: 0.3,
    metadata: {
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    },
  };
}

/**
 * Combine multiple agent responses into a coherent message
 */
export async function synthesizeResponses(
  agentResponses: AgentResponse[],
  userMessage: string,
  context: OrchestratorContext
): Promise<string> {
  // If only one agent responded, use its response directly
  if (agentResponses.length === 1) {
    return agentResponses[0].content;
  }

  // If multiple agents responded, synthesize their responses
  const synthesisPrompt = `You are synthesizing responses from multiple AI agents to create a coherent, helpful answer for the user.

User's question: "${userMessage}"

Agent responses:
${agentResponses.map((r, i) => `Agent ${i + 1} (${r.agent}): ${r.content}`).join('\n\n')}

Create a single, coherent response that:
1. Combines the best information from all agents
2. Eliminates redundancy
3. Maintains a natural, conversational tone
4. Prioritizes the most relevant information
5. Is concise but complete

Response:`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'user', content: synthesisPrompt },
      ],
      temperature: 0.7,
      // Note: maxTokens may not be available in all AI SDK versions
    });

    return result.text;
  } catch (error) {
    console.error('Error synthesizing responses:', error);
    // Fallback: return the highest confidence response
    const bestResponse = agentResponses.reduce((best, current) => 
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    );
    return bestResponse.content;
  }
}

