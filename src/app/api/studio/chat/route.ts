/**
 * AI Chat API - LangGraph Multi-Agent System
 */

import { runAgentGraph } from '@/lib/studio/langgraph';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, frameConfig, imageAnalysis } = await req.json();

    // Get the last user message
    const lastUserMessage = messages && messages.length > 0 
      ? messages.filter((m: any) => m.role === 'user').pop()?.content || ''
      : '';

    // Use LangGraph multi-agent system
    const result = await runAgentGraph(
      lastUserMessage,
      messages || [],
      frameConfig || {},
      imageAnalysis
    );
    
    // Process tool calls and results from LangGraph state
    const suggestions: any[] = [];
    let showLifestyleImages = false;
    let comparisonData = null;
    let imageSuggestions = null;
    
    // Process tool results from agent responses
    const allToolResults = result.toolResults || [];
    for (const toolResult of allToolResults) {
      const toolName = (toolResult as any).toolName || '';
      const toolResultData = (toolResult as any).result || toolResult;
      
      // Handle comparison tools
      if (toolName.includes('compare') || toolName === 'compareFrames' || toolName === 'compareProducts' || toolName === 'comparePrices') {
        comparisonData = toolResultData;
      }
      
      // Handle image suggestion tools
      if (toolName === 'getFrameVisuals' || toolName.includes('Image') || toolName === 'getVisualExamples') {
        imageSuggestions = toolResultData;
        showLifestyleImages = true;
      }
      
      // Handle recommendation tools
      if (toolName === 'recommendFrame' || toolName.includes('recommend')) {
        if (toolResultData && toolResultData.recommendations) {
          toolResultData.recommendations.forEach((rec: any) => {
            suggestions.push({
              id: rec.id,
              type: 'configuration',
              title: `Try ${rec.frameColor} ${rec.productType}`,
              description: rec.reason,
              changes: {
                productType: rec.productType,
                frameColor: rec.frameColor,
                size: rec.size,
                mount: rec.mount,
                glaze: rec.glaze,
              },
              confidence: rec.confidence,
              reason: rec.reason,
              timestamp: Date.now(),
            });
          });
        }
      }
      
      // Handle update tools
      if (toolName.includes('update') || toolName === 'updateFrame') {
        if (toolResultData && toolResultData.updates) {
          suggestions.push({
            id: `suggestion-${Date.now()}`,
            type: 'configuration',
            title: generateSuggestionTitle(toolResultData.updates),
            description: generateSuggestionDescription(toolResultData.updates, frameConfig),
            changes: toolResultData.updates,
            currentValues: extractCurrentValues(toolResultData.updates, frameConfig),
            confidence: 0.9,
            reason: generateSuggestionReason(toolResultData.updates, frameConfig),
            timestamp: Date.now(),
          });
        }
      }
      
      // Handle pricing tools
      if (toolName.includes('price') || toolName === 'getPriceQuote' || toolName === 'comparePrices') {
        // Store pricing information for display
        if (toolResultData && toolResultData.estimatedPrice) {
          // Pricing data can be displayed in UI
        }
      }
    }
    
    // Check if we should show lifestyle images based on content
    let finalContent = result.finalResponse || '';
    
    // Remove any markdown image links from the content (images are handled via tool results)
    // This prevents the AI from generating incorrect image paths
    finalContent = finalContent.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
    
    if (!showLifestyleImages) {
      const lowerContent = finalContent.toLowerCase();
      const productTypeKeywords = [
        'canvas', 'framed print', 'acrylic', 'metal', 'poster',
        'product type', 'wall art', 'recommend', 'suggest',
        'try canvas', 'make it', 'switch to'
      ];
      showLifestyleImages = productTypeKeywords.some(keyword => lowerContent.includes(keyword));
    }

    return NextResponse.json({
      role: 'assistant',
      content: finalContent,
      suggestions,
      showLifestyleImages,
      comparison: comparisonData,
      imageSuggestions: imageSuggestions,
      toolCalls: result.toolCalls || [],
    });
  } catch (error: any) {
    console.error('Error in AI chat:', error);
    
    // Never return an error to the user - always provide a helpful fallback
    const fallbackContent = 'I\'m here to help with your custom framing needs. I can assist with frame recommendations, pricing questions, and configuration options. How can I help you today?';
    
    return NextResponse.json({
      role: 'assistant',
      content: fallbackContent,
      suggestions: [],
      showLifestyleImages: false,
      comparison: null,
      imageSuggestions: null,
      toolCalls: [],
      metadata: {
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

function generateSuggestionTitle(changes: any): string {
  const keys = Object.keys(changes);
  if (keys.length === 1) {
    const key = keys[0];
    const value = changes[key];
    
    switch (key) {
      case 'frameColor':
        return `Change Frame to ${capitalize(value)}`;
      case 'size':
        return `Resize to ${value}"`;
      case 'glaze':
        return value === 'none' ? 'Remove Glaze' : `Apply ${capitalize(value)} Glaze`;
      case 'mount':
        return value === 'none' ? 'Remove Mount' : `Add ${value} Mount`;
      case 'wrap':
        return `Change Canvas Wrap to ${value}`;
      case 'productType':
        return `Switch to ${capitalize(value)}`;
      default:
        return `Update ${capitalize(key)}`;
    }
  }
  
  return `Update ${keys.length} Options`;
}

function generateSuggestionDescription(changes: any, current: any): string {
  const keys = Object.keys(changes);
  
  if (keys.length === 1) {
    const key = keys[0];
    const value = changes[key];
    const oldValue = current[key];
    
    if (oldValue && oldValue !== value) {
      return `Change from ${oldValue} to ${value}`;
    }
    
    return `Set ${key} to ${value}`;
  }
  
  const changeList = keys.map(k => `${k}: ${changes[k]}`).join(', ');
  return `Update multiple options: ${changeList}`;
}

function generateSuggestionReason(changes: any, current: any): string {
  const keys = Object.keys(changes);
  
  if (keys.includes('frameColor')) {
    const color = changes.frameColor;
    const reasons: Record<string, string> = {
      black: 'Black frames create a modern, elegant look that works with most artwork',
      white: 'White frames offer a clean, gallery-style appearance perfect for bright spaces',
      natural: 'Natural wood adds warmth and complements artwork beautifully',
      gold: 'Gold frames add a premium, classical touch ideal for elegant pieces',
      silver: 'Silver provides a sleek, modern metallic finish',
    };
    return reasons[color] || 'This color will enhance your artwork';
  }
  
  if (keys.includes('glaze')) {
    if (changes.glaze === 'motheye') {
      return 'Motheye glaze offers 99% UV protection and anti-glare properties - perfect for valuable artwork';
    }
    if (changes.glaze === 'acrylic') {
      return 'Acrylic glazing is shatter-resistant and budget-friendly while still protecting your art';
    }
  }
  
  if (keys.includes('mount') && changes.mount !== 'none') {
    return 'A mount creates breathing room around your artwork and adds a professional, gallery-quality look';
  }
  
  return 'This change will improve the overall presentation of your artwork';
}

function extractCurrentValues(changes: any, current: any): Record<string, any> {
  const values: Record<string, any> = {};
  Object.keys(changes).forEach(key => {
    values[key] = current[key];
  });
  return values;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
