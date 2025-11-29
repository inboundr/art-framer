/**
 * LangGraph State and Types
 * Defines the state schema for the multi-agent system
 */

import type { FrameConfiguration } from '@/store/studio';

/**
 * Agent State - The shared state that flows through the graph
 */
export interface AgentState {
  // User input
  userMessage: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  // Context
  frameConfig: FrameConfiguration;
  imageAnalysis?: any;
  
  // Routing
  selectedAgents: string[];
  currentAgent?: string;
  
  // Agent responses
  agentResponses: Record<string, {
    agent: string;
    content: string;
    toolCalls?: any[];
    toolResults?: any[];
    confidence?: number;
    metadata?: Record<string, any>;
  }>;
  
  // Final output
  finalResponse?: string;
  suggestions?: any[];
  showLifestyleImages?: boolean;
  comparison?: any;
  imageSuggestions?: any;
  toolCalls?: any[];
  toolResults?: any[];
  
  // Error handling
  errors?: Record<string, any>;
  retryCount?: number;
}

/**
 * Agent Response from individual agents
 */
export interface AgentResponse {
  agent: string;
  content: string;
  toolCalls?: any[];
  toolResults?: any[];
  confidence?: number;
  metadata?: Record<string, any>;
}

/**
 * Available agent types
 */
export type AgentType = 
  | 'frame-advisor'
  | 'prodigi-config'
  | 'image-generation'
  | 'pricing-advisor'
  | 'synthesizer';

