/**
 * LangGraph State Definition
 * Defines the state schema using LangGraph's StateGraph
 */

import { Annotation } from '@langchain/langgraph';
import type { AgentState } from './types';

/**
 * Create the state annotation for LangGraph
 * This defines the structure and reducer functions for the state
 */
export const createStateAnnotation = () => {
  return Annotation.Root({
    // User input
    userMessage: Annotation<string>({
      reducer: (x, y) => y ?? x,
    }),
    messages: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>({
      reducer: (x, y) => y ?? x,
    }),
    
    // Context
    frameConfig: Annotation<any>({
      reducer: (x, y) => y ?? x,
    }),
    imageAnalysis: Annotation<any>({
      reducer: (x, y) => y ?? x,
    }),
    
    // Routing
    selectedAgents: Annotation<string[]>({
      reducer: (x, y) => y ?? x ?? [],
    }),
    currentAgent: Annotation<string>({
      reducer: (x, y) => y ?? x,
    }),
    
    // Agent responses - merge responses from multiple agents
    agentResponses: Annotation<Record<string, AgentState['agentResponses'][string]>>({
      reducer: (x, y) => {
        if (!y) return x ?? {};
        if (!x) return y;
        return { ...x, ...y };
      },
    }),
    
    // Final output
    finalResponse: Annotation<string>({
      reducer: (x, y) => y ?? x,
    }),
    suggestions: Annotation<any[]>({
      reducer: (x, y) => y ?? x ?? [],
    }),
    showLifestyleImages: Annotation<boolean>({
      reducer: (x, y) => y ?? x ?? false,
    }),
    comparison: Annotation<any>({
      reducer: (x, y) => y ?? x,
    }),
    imageSuggestions: Annotation<any>({
      reducer: (x, y) => y ?? x,
    }),
    toolCalls: Annotation<any[]>({
      reducer: (x, y) => {
        if (!y) return x ?? [];
        if (!x) return y;
        return [...x, ...y];
      },
    }),
    toolResults: Annotation<any[]>({
      reducer: (x, y) => {
        if (!y) return x ?? [];
        if (!x) return y;
        return [...x, ...y];
      },
    }),
    
    // Error handling
    errors: Annotation<Record<string, any>>({
      reducer: (x, y) => {
        if (!y) return x ?? {};
        if (!x) return y;
        return { ...x, ...y };
      },
    }),
    retryCount: Annotation<number>({
      reducer: (x, y) => (y ?? x ?? 0),
    }),
  });
};

