/**
 * Synthesizer Node
 * Combines responses from multiple agents into a coherent final response
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { AgentState } from '../types';

/**
 * Synthesizer Node - combines agent responses
 */
export async function synthesizerNode(state: AgentState): Promise<Partial<AgentState>> {
  const { agentResponses, userMessage } = state;
  
  // If only one agent responded, use its response directly
  const agentKeys = Object.keys(agentResponses || {});
  if (agentKeys.length === 1) {
    const singleResponse = agentResponses![agentKeys[0]];
    return {
      finalResponse: singleResponse.content,
      toolCalls: singleResponse.toolCalls || [],
      toolResults: singleResponse.toolResults || [],
    };
  }

  // If multiple agents responded, synthesize their responses
  try {
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
    });

    const agentResponseText = agentKeys.map(key => {
      const response = agentResponses![key];
      return `Agent: ${response.agent}\nResponse: ${response.content}`;
    }).join('\n\n');

    const synthesisPrompt = `You are synthesizing responses from multiple AI agents to create a coherent, helpful answer for the user.

User's question: "${userMessage}"

Agent responses:
${agentResponseText}

Create a single, coherent response that:
1. Combines the best information from all agents
2. Eliminates redundancy
3. Maintains a natural, conversational tone
4. Prioritizes the most relevant information
5. Is concise but complete
6. Preserves important details from each agent

CRITICAL - Image Handling:
- DO NOT include markdown image links (![alt](path)) in your response
- Images are automatically displayed from tool results - you don't need to add them manually
- NEVER make up image paths - only describe images in text if needed
- When mentioning images, just describe them - don't add markdown links

Response:`;

    const response = await model.invoke([
      { role: 'user', content: synthesisPrompt },
    ]);

    // Combine tool calls and results from all agents
    const allToolCalls: any[] = [];
    const allToolResults: any[] = [];

    agentKeys.forEach(key => {
      const agentResponse = agentResponses![key];
      if (agentResponse.toolCalls) {
        allToolCalls.push(...agentResponse.toolCalls);
      }
      if (agentResponse.toolResults) {
        allToolResults.push(...agentResponse.toolResults);
      }
    });

    return {
      finalResponse: response.content as string,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
    };
  } catch (error) {
    console.error('Error synthesizing responses:', error);
    // Fallback: return the highest confidence response
    const bestResponse = agentKeys.reduce((best, current) => {
      const bestConf = agentResponses![best]?.confidence || 0;
      const currentConf = agentResponses![current]?.confidence || 0;
      return currentConf > bestConf ? current : best;
    }, agentKeys[0]);

    const response = agentResponses![bestResponse];
    return {
      finalResponse: response.content,
      toolCalls: response.toolCalls || [],
      toolResults: response.toolResults || [],
    };
  }
}

