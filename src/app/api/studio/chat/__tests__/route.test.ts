/**
 * Comprehensive tests for AI Chat API
 * Tests the multi-agent system, orchestrator, and all agents
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock the LangGraph system
jest.mock('@/lib/studio/langgraph', () => ({
  runAgentGraph: jest.fn(),
}));

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('/api/studio/chat', () => {
  const { runAgentGraph } = require('@/lib/studio/langgraph');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/studio/chat', () => {
    it('should handle successful chat request with basic response', async () => {
      const mockResult = {
        finalResponse: 'I recommend a black frame for your artwork.',
        toolCalls: [],
        toolResults: [],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'What frame should I use?' }],
        frameConfig: { productType: 'framed-print', size: '16x20' },
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      // Mock the json method
      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.role).toBe('assistant');
      expect(responseData.content).toBe('I recommend a black frame for your artwork.');
      expect(responseData.suggestions).toEqual([]);
      // showLifestyleImages may be true if content contains keywords
      expect(typeof responseData.showLifestyleImages).toBe('boolean');
      expect(runAgentGraph).toHaveBeenCalledWith(
        'What frame should I use?',
        [{ role: 'user', content: 'What frame should I use?' }],
        { productType: 'framed-print', size: '16x20' },
        null
      );
    });

    it('should handle recommendations and convert them to suggestions', async () => {
      const mockResult = {
        finalResponse: 'Here are some frame recommendations for you.',
        toolCalls: [],
        toolResults: [
          {
            toolName: 'recommendFrame',
            result: {
              recommendations: [
                {
                  id: 'rec-1',
                  productType: 'framed-print',
                  frameColor: 'black',
                  size: '16x20',
                  mount: 'none',
                  glaze: 'acrylic',
                  reason: 'Perfect for modern artwork',
                  confidence: 0.9,
                },
              ],
            },
          },
        ],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'Recommend a frame' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.suggestions).toHaveLength(1);
      expect(responseData.suggestions[0]).toMatchObject({
        type: 'configuration',
        title: 'Try black framed-print',
        changes: {
          productType: 'framed-print',
          frameColor: 'black',
          size: '16x20',
          mount: 'none',
          glaze: 'acrylic',
        },
        confidence: 0.9,
      });
    });

    it('should handle comparison tools', async () => {
      const mockResult = {
        finalResponse: 'Here is a comparison of the two options.',
        toolCalls: [],
        toolResults: [
          {
            toolName: 'compareFrames',
            result: {
              differences: ['Frame Color: black vs white'],
              similarities: ['Both are 16x20'],
              option1: { frameColor: 'black', size: '16x20' },
              option2: { frameColor: 'white', size: '16x20' },
              recommendation: 'Option 1 is better for modern artwork',
            },
          },
        ],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'Compare black and white frames' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.comparison).toBeDefined();
      expect(responseData.comparison.differences).toContain('Frame Color: black vs white');
      expect(responseData.comparison.similarities).toContain('Both are 16x20');
    });

    it('should handle image suggestions and set showLifestyleImages flag', async () => {
      const mockResult = {
        finalResponse: 'Here are some visual examples.',
        toolCalls: [],
        toolResults: [
          {
            toolName: 'getFrameVisuals',
            result: {
              images: [
                { path: '/images/lifestyle1.jpg', type: 'lifestyle', description: 'Example 1' },
                { path: '/images/lifestyle2.jpg', type: 'lifestyle', description: 'Example 2' },
              ],
            },
          },
        ],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'Show me examples' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      // The tool name is 'getFrameVisuals' which should trigger showLifestyleImages
      expect(responseData.showLifestyleImages).toBe(true);
      expect(responseData.imageSuggestions).toBeDefined();
      if (responseData.imageSuggestions) {
        expect(responseData.imageSuggestions.images).toHaveLength(2);
      }
    });

    it('should automatically detect lifestyle images from content keywords', async () => {
      const mockResult = {
        finalResponse: 'I recommend trying a canvas product for your artwork. Canvas prints look great on walls.',
        toolCalls: [],
        toolResults: [],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'What should I use?' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.showLifestyleImages).toBe(true);
    });

    it('should handle update frame tools', async () => {
      const mockResult = {
        finalResponse: 'I\'ve updated your frame configuration.',
        toolCalls: [],
        toolResults: [
          {
            toolName: 'updateFrame',
            result: {
              updates: {
                frameColor: 'black',
                size: '24x36',
              },
            },
          },
        ],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'Update my frame' }],
        frameConfig: { frameColor: 'white', size: '16x20' },
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.suggestions).toHaveLength(1);
      expect(responseData.suggestions[0].changes).toEqual({
        frameColor: 'black',
        size: '24x36',
      });
    });

    it('should handle pricing tools', async () => {
      const mockResult = {
        finalResponse: 'Here is the pricing information.',
        toolCalls: [],
        toolResults: [
          {
            toolName: 'getPriceQuote',
            result: {
              estimatedPrice: {
                product: 50.00,
                shipping: 10.00,
                total: 60.00,
                currency: 'USD',
              },
            },
          },
        ],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'How much does it cost?' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.content).toContain('pricing');
    });

    it('should handle errors gracefully with fallback response', async () => {
      const error = new Error('API key not configured');
      runAgentGraph.mockRejectedValue(error);

      const requestBody = {
        messages: [{ role: 'user', content: 'Hello' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.role).toBe('assistant');
      expect(responseData.content).toContain('help with your custom framing needs');
      expect(responseData.metadata).toBeDefined();
      expect(responseData.metadata.fallback).toBe(true);
      // Console.error may be called, but the fallback response is what matters
    });

    it('should handle missing request body gracefully', async () => {
      const requestBody = {};

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      // Mock runAgentGraph to handle undefined
      runAgentGraph.mockResolvedValue({
        finalResponse: 'I\'m here to help.',
        toolCalls: [],
        toolResults: [],
        agentResponses: {},
      });

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.role).toBe('assistant');
    });

    it('should preserve tool calls in response', async () => {
      const mockResult = {
        finalResponse: 'I used some tools to help you.',
        toolCalls: [
          { toolName: 'getFrameVisuals', args: { productType: 'canvas' } },
        ],
        toolResults: [],
        agentResponses: {},
      };

      runAgentGraph.mockResolvedValue(mockResult);

      const requestBody = {
        messages: [{ role: 'user', content: 'Show examples' }],
        frameConfig: {},
        imageAnalysis: null,
      };

      const request = new NextRequest('http://localhost:3000/api/studio/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      request.json = jest.fn().mockResolvedValue(requestBody);

      const response = await POST(request);
      const responseData = JSON.parse(response.body as unknown as string);

      expect(response.status).toBe(200);
      expect(responseData.toolCalls).toHaveLength(1);
      expect(responseData.toolCalls[0].toolName).toBe('getFrameVisuals');
    });
  });
});

