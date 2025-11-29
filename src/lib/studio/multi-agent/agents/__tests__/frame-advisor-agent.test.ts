/**
 * Tests for Frame Advisor Agent
 */

import { frameAdvisorAgent } from '../frame-advisor-agent';
import type { OrchestratorContext } from '../../orchestrator';

// Mock OpenAI and AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  tool: jest.fn((def) => def),
}));

jest.mock('@/lib/prodigi-assets/asset-catalog', () => ({
  getLifestyleImages: jest.fn(() => ['/images/lifestyle1.jpg', '/images/lifestyle2.jpg']),
  getChevronImage: jest.fn(() => '/images/chevron.jpg'),
  getCornerImages: jest.fn(() => ['/images/corner1.jpg']),
  getCrossSectionImage: jest.fn(() => '/images/cross-section.jpg'),
}));

describe('Frame Advisor Agent', () => {
  const { generateText } = require('ai');
  const { getLifestyleImages, getChevronImage, getCornerImages, getCrossSectionImage } = require('@/lib/prodigi-assets/asset-catalog');

  const mockContext: OrchestratorContext = {
    frameConfig: {
      productType: 'framed-print',
      size: '16x20',
      frameColor: 'black',
    },
    conversationHistory: [],
    imageAnalysis: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  it('should generate frame recommendations successfully', async () => {
    const mockResult = {
      text: 'I recommend a black frame for your artwork.',
      toolCalls: [],
      toolResults: [],
    };

    generateText.mockResolvedValue(mockResult);

    const response = await frameAdvisorAgent('What frame should I use?', mockContext);

    expect(response.agent).toBe('frame-advisor');
    expect(response.content).toBe('I recommend a black frame for your artwork.');
    expect(response.confidence).toBe(0.85);
    expect(generateText).toHaveBeenCalled();
  });

  it('should handle tool calls for getFrameVisuals', async () => {
    const mockResult = {
      text: 'Here are some visual examples.',
      toolCalls: [
        {
          toolName: 'getFrameVisuals',
          args: {
            productType: 'canvas',
            frameConfig: { frameType: 'classic', frameColor: 'black' },
            viewType: 'lifestyle',
            limit: 5,
          },
        },
      ],
      toolResults: [
        {
          toolName: 'getFrameVisuals',
          result: {
            images: [
              { path: '/images/lifestyle1.jpg', type: 'lifestyle', description: 'Example 1' },
            ],
            count: 1,
          },
        },
      ],
    };

    generateText.mockResolvedValue(mockResult);

    const response = await frameAdvisorAgent('Show me examples', mockContext);

    expect(response.agent).toBe('frame-advisor');
    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolResults).toHaveLength(1);
  });

  it('should handle tool calls for recommendFrame', async () => {
    const mockResult = {
      text: 'Here are my recommendations.',
      toolCalls: [
        {
          toolName: 'recommendFrame',
          args: {
            artworkStyle: 'modern',
            roomType: 'living room',
            budget: 'mid-range',
            count: 3,
          },
        },
      ],
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
                reason: 'Perfect for modern artwork',
                confidence: 0.9,
              },
            ],
          },
        },
      ],
    };

    generateText.mockResolvedValue(mockResult);

    const response = await frameAdvisorAgent('Recommend a frame', mockContext);

    expect(response.agent).toBe('frame-advisor');
    expect(response.toolResults).toHaveLength(1);
    expect(response.toolResults[0].result.recommendations).toBeDefined();
  });

  it('should handle tool calls for compareFrames', async () => {
    const mockResult = {
      text: 'Here is a comparison.',
      toolCalls: [
        {
          toolName: 'compareFrames',
          args: {
            op1_frameColor: 'black',
            op1_size: '16x20',
            op2_frameColor: 'white',
            op2_size: '16x20',
          },
        },
      ],
      toolResults: [
        {
          toolName: 'compareFrames',
          result: {
            differences: ['Frame Color: black vs white'],
            similarities: ['Both are 16x20'],
            option1: { frameColor: 'black', size: '16x20' },
            option2: { frameColor: 'white', size: '16x20' },
          },
        },
      ],
    };

    generateText.mockResolvedValue(mockResult);

    const response = await frameAdvisorAgent('Compare black and white frames', mockContext);

    expect(response.agent).toBe('frame-advisor');
    expect(response.toolResults[0].result.differences).toContain('Frame Color: black vs white');
  });

  it('should handle API key errors with fallback', async () => {
    const error = {
      code: 'AI_LoadAPIKeyError',
      message: 'API key not configured',
    };

    generateText.mockRejectedValue(error);

    const response = await frameAdvisorAgent('What frame should I use?', mockContext);

    expect(response.agent).toBe('frame-advisor');
    expect(response.content).toContain('black frame');
    expect(response.metadata).toBeDefined();
    expect(response.metadata.fallback).toBe(true);
  });

  it('should handle generic errors with fallback', async () => {
    const error = new Error('Unknown error');
    generateText.mockRejectedValue(error);

    const response = await frameAdvisorAgent('What frame should I use?', mockContext);

    expect(response.agent).toBe('frame-advisor');
    expect(response.content).toContain('encountered an issue');
    expect(response.metadata).toBeDefined();
    expect(response.metadata.fallback).toBe(true);
  });

  it('should include context in system prompt', async () => {
    const mockResult = {
      text: 'Response',
      toolCalls: [],
      toolResults: [],
    };

    generateText.mockResolvedValue(mockResult);

    await frameAdvisorAgent('Test', mockContext);

    const callArgs = generateText.mock.calls[0][0];
    expect(callArgs.system).toContain('Product Type: framed-print');
    expect(callArgs.system).toContain('Size: 16x20');
    expect(callArgs.system).toContain('Frame Color: black');
  });

  it('should include conversation history in messages', async () => {
    const contextWithHistory: OrchestratorContext = {
      ...mockContext,
      conversationHistory: [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
      ],
    };

    const mockResult = {
      text: 'Response',
      toolCalls: [],
      toolResults: [],
    };

    generateText.mockResolvedValue(mockResult);

    await frameAdvisorAgent('Third message', contextWithHistory);

    const callArgs = generateText.mock.calls[0][0];
    expect(callArgs.messages.length).toBeGreaterThan(1);
    expect(callArgs.messages[callArgs.messages.length - 1]).toEqual({
      role: 'user',
      content: 'Third message',
    });
  });
});

