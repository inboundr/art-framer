/**
 * Router Node
 * Intelligently routes user messages to appropriate agents
 */

import type { AgentState } from '../types';

/**
 * Router node - determines which agents should handle the request
 */
export async function routerNode(state: AgentState): Promise<Partial<AgentState>> {
  const { userMessage } = state;
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
    lowerMessage.includes('product type') ||
    lowerMessage.includes('validate')
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
    lowerMessage.includes('best') ||
    lowerMessage.includes('visual') ||
    lowerMessage.includes('lifestyle')
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
    lowerMessage.includes('generate image') ||
    lowerMessage.includes('prompt')
  ) {
    selectedAgents.push('image-generation');
  }

  // Pricing Advisor Agent - for pricing questions, cost optimization, shipping
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
    lowerMessage.includes('discount') ||
    lowerMessage.includes('quote') ||
    lowerMessage.includes('shipping') ||
    lowerMessage.includes('ship') ||
    lowerMessage.includes('delivery') ||
    lowerMessage.includes('shipping cost') ||
    lowerMessage.includes('shipping to')
  ) {
    selectedAgents.push('pricing-advisor');
  }

  // If no specific agent matches, default to frame advisor
  if (selectedAgents.length === 0) {
    selectedAgents.push('frame-advisor');
  }

  // Always include frame advisor for general guidance if we have space
  if (!selectedAgents.includes('frame-advisor') && selectedAgents.length < 2) {
    selectedAgents.push('frame-advisor');
  }

  return {
    selectedAgents,
  };
}

