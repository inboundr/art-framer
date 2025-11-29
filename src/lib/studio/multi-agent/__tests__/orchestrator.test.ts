/**
 * Tests for the Multi-Agent Orchestrator
 */

import { routeToAgents, executeAgent } from '../orchestrator';
import type { OrchestratorContext } from '../orchestrator';

// Mock all agents
jest.mock('../agents/frame-advisor-agent', () => ({
  frameAdvisorAgent: jest.fn(),
}));

jest.mock('../agents/prodigi-config-agent', () => ({
  prodigiConfigAgent: jest.fn(),
}));

jest.mock('../agents/image-generation-agent', () => ({
  imageGenerationAgent: jest.fn(),
}));

jest.mock('../agents/pricing-advisor-agent', () => ({
  pricingAdvisorAgent: jest.fn(),
}));

describe('Multi-Agent Orchestrator', () => {
  const { frameAdvisorAgent } = require('../agents/frame-advisor-agent');
  const { prodigiConfigAgent } = require('../agents/prodigi-config-agent');
  const { imageGenerationAgent } = require('../agents/image-generation-agent');
  const { pricingAdvisorAgent } = require('../agents/pricing-advisor-agent');

  const mockContext: OrchestratorContext = {
    frameConfig: {
      productType: 'framed-print',
      size: '16x20',
      frameColor: 'black',
    },
    conversationHistory: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ],
    imageAnalysis: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('routeToAgents', () => {
    it('should route frame recommendation requests to frame-advisor agent', async () => {
      const mockResponse = {
        agent: 'frame-advisor',
        content: 'I recommend a black frame.',
        confidence: 0.9,
      };

      frameAdvisorAgent.mockResolvedValue(mockResponse);

      const result = await routeToAgents('What frame should I use?', mockContext);

      expect(frameAdvisorAgent).toHaveBeenCalledWith('What frame should I use?', mockContext);
      expect(result).toEqual(mockResponse);
    });

    it('should route pricing questions to pricing-advisor agent', async () => {
      const mockResponse = {
        agent: 'pricing-advisor',
        content: 'The price is $50.',
        confidence: 0.95,
      };

      pricingAdvisorAgent.mockResolvedValue(mockResponse);

      const result = await routeToAgents('How much does it cost?', mockContext);

      expect(pricingAdvisorAgent).toHaveBeenCalledWith('How much does it cost?', mockContext);
      expect(result).toEqual(mockResponse);
    });

    it('should route image generation requests to image-generation agent', async () => {
      const mockResponse = {
        agent: 'image-generation',
        content: 'Here is your generated image.',
        confidence: 0.85,
      };

      imageGenerationAgent.mockResolvedValue(mockResponse);

      const result = await routeToAgents('Generate an image of a sunset', mockContext);

      expect(imageGenerationAgent).toHaveBeenCalledWith('Generate an image of a sunset', mockContext);
      expect(result).toEqual(mockResponse);
    });

    it('should route technical configuration questions to prodigi-config agent', async () => {
      const mockResponse = {
        agent: 'prodigi-config',
        content: 'The SKU is FRAME-16X20-BLK.',
        confidence: 0.9,
      };

      prodigiConfigAgent.mockResolvedValue(mockResponse);

      const result = await routeToAgents('What is the SKU for this configuration?', mockContext);

      expect(prodigiConfigAgent).toHaveBeenCalledWith('What is the SKU for this configuration?', mockContext);
      expect(result).toEqual(mockResponse);
    });

    it('should default to frame-advisor for ambiguous requests', async () => {
      const mockResponse = {
        agent: 'frame-advisor',
        content: 'I can help with that.',
        confidence: 0.7,
      };

      frameAdvisorAgent.mockResolvedValue(mockResponse);

      const result = await routeToAgents('Hello', mockContext);

      expect(frameAdvisorAgent).toHaveBeenCalledWith('Hello', mockContext);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('executeAgent', () => {
    it('should execute an agent and return its response', async () => {
      const mockResponse = {
        agent: 'frame-advisor',
        content: 'Test response',
        confidence: 0.9,
      };

      frameAdvisorAgent.mockResolvedValue(mockResponse);

      const result = await executeAgent('frame-advisor', 'Test message', mockContext);

      expect(frameAdvisorAgent).toHaveBeenCalledWith('Test message', mockContext);
      expect(result).toEqual(mockResponse);
    });

    it('should handle agent errors gracefully', async () => {
      const error = new Error('Agent failed');
      frameAdvisorAgent.mockRejectedValue(error);

      const result = await executeAgent('frame-advisor', 'Test message', mockContext);

      expect(result).toBeDefined();
      expect(result.agent).toBe('frame-advisor');
      expect(result.content).toContain('encountered an issue');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle unknown agent types', async () => {
      const result = await executeAgent('unknown-agent' as any, 'Test message', mockContext);

      expect(result).toBeDefined();
      expect(result.agent).toBe('unknown-agent');
      expect(result.content).toContain('not available');
    });
  });
});

