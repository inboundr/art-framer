/**
 * Tests for Prodigi Configuration Agent
 */

import { prodigiConfigAgent } from '../prodigi-config-agent';
import type { OrchestratorContext } from '../../orchestrator';

// Mock OpenAI and AI SDK
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  tool: jest.fn((def) => def),
}));

jest.mock('@/lib/prodigi-v2', () => ({
  catalog: {
    getSKU: jest.fn(),
  },
  products: {
    get: jest.fn(),
  },
}));

describe('Prodigi Configuration Agent', () => {
  const { generateText } = require('ai');
  const { catalog, products } = require('@/lib/prodigi-v2');

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

  it('should handle SKU lookup requests', async () => {
    const mockResult = {
      text: 'The SKU is FRAME-16X20-BLK.',
      toolCalls: [
        {
          toolName: 'lookupSKU',
          args: {
            productType: 'framed-print',
            size: '16x20',
            frameColor: 'black',
          },
        },
      ],
      toolResults: [
        {
          toolName: 'lookupSKU',
          result: {
            success: true,
            sku: 'FRAME-16X20-BLK',
            productName: 'Framed Print 16x20 Black',
          },
        },
      ],
    };

    catalog.getSKU.mockResolvedValue('FRAME-16X20-BLK');
    products.get.mockResolvedValue({
      name: 'Framed Print 16x20 Black',
      description: 'A beautiful framed print',
    });

    generateText.mockResolvedValue(mockResult);

    const response = await prodigiConfigAgent('What is the SKU?', mockContext);

    expect(response.agent).toBe('prodigi-config');
    expect(response.toolResults).toHaveLength(1);
  });

  it('should handle configuration validation requests', async () => {
    const mockResult = {
      text: 'Your configuration is valid.',
      toolCalls: [
        {
          toolName: 'validateConfig',
          args: {
            productType: 'framed-print',
            size: '16x20',
            frameColor: 'black',
          },
        },
      ],
      toolResults: [
        {
          toolName: 'validateConfig',
          result: {
            valid: true,
            sku: 'FRAME-16X20-BLK',
            errors: [],
            warnings: [],
          },
        },
      ],
    };

    catalog.getSKU.mockResolvedValue('FRAME-16X20-BLK');
    products.get.mockResolvedValue({
      attributes: {
        color: true,
        mount: true,
      },
    });

    generateText.mockResolvedValue(mockResult);

    const response = await prodigiConfigAgent('Is my configuration valid?', mockContext);

    expect(response.agent).toBe('prodigi-config');
    expect(response.toolResults[0].result.valid).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('API error');
    generateText.mockRejectedValue(error);

    const response = await prodigiConfigAgent('Test', mockContext);

    expect(response.agent).toBe('prodigi-config');
    expect(response.content).toContain('encountered an issue');
    expect(response.metadata).toBeDefined();
    expect(response.metadata.fallback).toBe(true);
  });
});

