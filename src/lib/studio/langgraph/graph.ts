/**
 * Main LangGraph Workflow
 * Orchestrates the multi-agent system using LangGraph
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import { createStateAnnotation } from './state';
import { routerNode } from './nodes/router';
import { frameAdvisorNode } from './nodes/agents/frame-advisor';
import { prodigiConfigNode } from './nodes/agents/prodigi-config';
import { pricingAdvisorNode } from './nodes/agents/pricing-advisor';
import { imageGenerationNode } from './nodes/agents/image-generation';
import { synthesizerNode } from './nodes/synthesizer';
import type { AgentState } from './types';

/**
 * Create the main LangGraph workflow
 */
export function createAgentGraph() {
  const workflow = new StateGraph(createStateAnnotation());

  // Add nodes (only the ones that are actually used in edges)
  workflow.addNode('router', routerNode);
  workflow.addNode('synthesizer', synthesizerNode);

  // Add a node to handle multiple agents in parallel
  workflow.addNode('execute-agents', async (state: AgentState) => {
    const selectedAgents = state.selectedAgents || ['frame-advisor'];
    const results: Partial<AgentState> = { agentResponses: {} };

    // Execute all selected agents in parallel
    const agentPromises = selectedAgents.map(async (agentName) => {
      try {
        switch (agentName) {
          case 'frame-advisor':
            return await frameAdvisorNode(state);
          case 'prodigi-config':
            return await prodigiConfigNode(state);
          case 'pricing-advisor':
            return await pricingAdvisorNode(state);
          case 'image-generation':
            return await imageGenerationNode(state);
          default:
            return await frameAdvisorNode(state);
        }
      } catch (error) {
        console.error(`Error executing agent ${agentName}:`, error);
        return {
          agentResponses: {
            [agentName]: {
              agent: agentName,
              content: 'I encountered an issue. Please try again.',
              confidence: 0.3,
              metadata: { fallback: true, error },
            },
          },
        };
      }
    });

    const agentResults = await Promise.all(agentPromises);
    
    // Merge all agent responses
    agentResults.forEach(result => {
      if (result.agentResponses) {
        Object.assign(results.agentResponses!, result.agentResponses);
      }
    });

    return results;
  });

  // Set entry point - START to router (cast to satisfy type constraint)
  workflow.addEdge(START, 'router' as any);

  // Route from router to execute-agents (cast to satisfy type constraint)
  workflow.addEdge('router' as any, 'execute-agents' as any);

  // All agents go to synthesizer (cast to satisfy type constraint)
  workflow.addEdge('execute-agents' as any, 'synthesizer' as any);

  // Synthesizer is the end (cast to satisfy type constraint)
  workflow.addEdge('synthesizer' as any, END);

  return workflow.compile();
}

/**
 * Run the agent graph with initial state
 */
export async function runAgentGraph(
  userMessage: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  frameConfig: any,
  imageAnalysis?: any
): Promise<AgentState> {
  const graph = createAgentGraph();

  const initialState: AgentState = {
    userMessage,
    messages,
    frameConfig,
    imageAnalysis,
    selectedAgents: [],
    agentResponses: {},
  };

  const result = await graph.invoke(initialState);
  return result as AgentState;
}

