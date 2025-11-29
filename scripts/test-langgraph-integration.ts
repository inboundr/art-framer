/**
 * Integration Tests for LangGraph Multi-Agent System
 * Tests the actual system with real API calls
 */

import * as dotenv from 'dotenv';
import { runAgentGraph } from '../src/lib/studio/langgraph/index.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

interface TestCase {
  name: string;
  userMessage: string;
  frameConfig: any;
  expectedAgents?: string[];
  expectedContent?: string[];
  expectedTools?: string[];
}

const testCases: TestCase[] = [
  {
    name: 'Frame Recommendation Request',
    userMessage: 'What frame should I use for a modern abstract painting?',
    frameConfig: { productType: 'framed-print', size: '16x20' },
    expectedAgents: ['frame-advisor'],
    expectedContent: ['frame', 'recommend'],
  },
  {
    name: 'Pricing Question',
    userMessage: 'How much does a 24x36 framed print cost?',
    frameConfig: { productType: 'framed-print', size: '24x36' },
    expectedAgents: ['pricing-advisor'],
    expectedContent: ['price', 'cost'],
  },
  {
    name: 'SKU Lookup Request',
    userMessage: 'What is the SKU for a 16x20 black framed print?',
    frameConfig: { productType: 'framed-print', size: '16x20', frameColor: 'black' },
    expectedAgents: ['prodigi-config'],
    expectedContent: ['SKU', 'sku'],
  },
  {
    name: 'Image Generation Request',
    userMessage: 'Help me create an AI image of a sunset for framing',
    frameConfig: {},
    expectedAgents: ['image-generation'],
    expectedContent: ['image', 'prompt', 'create'],
  },
  {
    name: 'Complex Multi-Agent Request',
    userMessage: 'Recommend a frame for my artwork and tell me the price',
    frameConfig: { productType: 'framed-print', size: '16x20' },
    expectedAgents: ['frame-advisor', 'pricing-advisor'],
    expectedContent: ['frame', 'price'],
  },
  {
    name: 'Visual Examples Request',
    userMessage: 'Show me examples of canvas frames',
    frameConfig: { productType: 'canvas' },
    expectedAgents: ['frame-advisor'],
    expectedTools: ['getFrameVisuals'],
  },
  {
    name: 'Comparison Request',
    userMessage: 'Compare black and white frames',
    frameConfig: {},
    expectedAgents: ['frame-advisor'],
    expectedContent: ['compare', 'black', 'white'],
  },
];

async function runIntegrationTest(testCase: TestCase): Promise<{
  passed: boolean;
  error?: string;
  result?: any;
}> {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   Message: "${testCase.userMessage}"`);

  try {
    const startTime = Date.now();
    
    const result = await runAgentGraph(
      testCase.userMessage,
      [],
      testCase.frameConfig || {},
      null
    );

    const duration = Date.now() - startTime;

    // Verify result structure
    if (!result) {
      return {
        passed: false,
        error: 'Result is null or undefined',
      };
    }

    // Check selected agents
    if (testCase.expectedAgents) {
      const selectedAgents = result.selectedAgents || [];
      const hasExpectedAgent = testCase.expectedAgents.some(agent =>
        selectedAgents.includes(agent)
      );
      if (!hasExpectedAgent) {
        return {
          passed: false,
          error: `Expected agents ${testCase.expectedAgents.join(', ')}, got ${selectedAgents.join(', ')}`,
          result,
        };
      }
      console.log(`   ✅ Agents selected: ${selectedAgents.join(', ')}`);
    }

    // Check agent responses
    if (result.agentResponses) {
      const agentKeys = Object.keys(result.agentResponses);
      console.log(`   ✅ Agent responses: ${agentKeys.join(', ')}`);
      
      agentKeys.forEach(key => {
        const response = result.agentResponses[key];
        console.log(`      - ${key}: ${response.content?.substring(0, 100)}...`);
      });
    }

    // Check final response
    if (!result.finalResponse) {
      return {
        passed: false,
        error: 'No final response generated',
        result,
      };
    }

    console.log(`   ✅ Final response: ${result.finalResponse.substring(0, 150)}...`);

    // Check expected content
    if (testCase.expectedContent) {
      const lowerResponse = result.finalResponse.toLowerCase();
      const hasExpectedContent = testCase.expectedContent.some(content =>
        lowerResponse.includes(content.toLowerCase())
      );
      if (!hasExpectedContent) {
        console.log(`   ⚠️  Warning: Expected content not found: ${testCase.expectedContent.join(', ')}`);
      } else {
        console.log(`   ✅ Contains expected content`);
      }
    }

    // Check tool calls
    if (testCase.expectedTools) {
      const toolCalls = result.toolCalls || [];
      const toolNames = toolCalls.map((tc: any) => tc.toolName || tc.name || '');
      const hasExpectedTool = testCase.expectedTools.some(tool =>
        toolNames.includes(tool)
      );
      if (hasExpectedTool) {
        console.log(`   ✅ Tools called: ${toolNames.join(', ')}`);
      } else {
        console.log(`   ⚠️  Warning: Expected tools not called: ${testCase.expectedTools.join(', ')}`);
      }
    }

    // Check tool results
    if (result.toolResults && result.toolResults.length > 0) {
      console.log(`   ✅ Tool results: ${result.toolResults.length} result(s)`);
      result.toolResults.forEach((tr: any) => {
        console.log(`      - ${tr.toolName}: ${JSON.stringify(tr.result).substring(0, 100)}...`);
      });
    }

    console.log(`   ⏱️  Duration: ${duration}ms`);

    return {
      passed: true,
      result,
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      passed: false,
      error: error.message,
    };
  }
}

async function runAllTests() {
  console.log('🚀 Starting LangGraph Integration Tests');
  console.log('=' .repeat(60));

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await runIntegrationTest(testCase);
    results.push({ testCase, result });
    
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${testCases.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.forEach(({ testCase, result }) => {
      if (!result.passed) {
        console.log(`   - ${testCase.name}: ${result.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

