/**
 * Integration Tests for Chat API Route
 * Tests the actual API endpoint with real requests
 */

import * as dotenv from 'dotenv';
import { NextRequest } from 'next/server';

// Load environment variables
dotenv.config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env.local');
  process.exit(1);
}

interface APITestCase {
  name: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  frameConfig: any;
  imageAnalysis?: any;
  expectedStatus: number;
  expectedFields?: string[];
  expectedContent?: string[];
}

const apiTestCases: APITestCase[] = [
  {
    name: 'Basic Chat Request',
    messages: [{ role: 'user', content: 'Hello, what frames do you recommend?' }],
    frameConfig: { productType: 'framed-print', size: '16x20' },
    expectedStatus: 200,
    expectedFields: ['role', 'content', 'suggestions', 'showLifestyleImages'],
    expectedContent: ['frame', 'recommend'],
  },
  {
    name: 'Recommendation Request',
    messages: [{ role: 'user', content: 'Recommend a frame for modern artwork' }],
    frameConfig: {},
    expectedStatus: 200,
    expectedFields: ['role', 'content', 'suggestions'],
  },
  {
    name: 'Pricing Question',
    messages: [{ role: 'user', content: 'How much does it cost?' }],
    frameConfig: { productType: 'framed-print', size: '24x36' },
    expectedStatus: 200,
    expectedContent: ['price', 'cost'],
  },
  {
    name: 'Visual Examples Request',
    messages: [{ role: 'user', content: 'Show me examples of canvas frames' }],
    frameConfig: { productType: 'canvas' },
    expectedStatus: 200,
    expectedFields: ['imageSuggestions', 'showLifestyleImages'],
  },
  {
    name: 'Comparison Request',
    messages: [{ role: 'user', content: 'Compare black and white frames' }],
    frameConfig: {},
    expectedStatus: 200,
    expectedFields: ['comparison'],
  },
  {
    name: 'Multi-turn Conversation',
    messages: [
      { role: 'user', content: 'What frame should I use?' },
      { role: 'assistant', content: 'I recommend a black frame for modern artwork.' },
      { role: 'user', content: 'What about the price?' },
    ],
    frameConfig: { productType: 'framed-print', size: '16x20', frameColor: 'black' },
    expectedStatus: 200,
    expectedContent: ['price'],
  },
];

async function testAPIEndpoint(testCase: APITestCase): Promise<{
  passed: boolean;
  error?: string;
  response?: any;
}> {
  console.log(`\n🧪 Testing API: ${testCase.name}`);
  console.log(`   Message: "${testCase.messages[testCase.messages.length - 1].content}"`);

  try {
    // Import the route handler
    const { POST } = await import('../src/app/api/studio/chat/route');

    // Create request
    const requestBody = {
      messages: testCase.messages,
      frameConfig: testCase.frameConfig,
      imageAnalysis: testCase.imageAnalysis,
    };

    const request = new NextRequest(`${BASE_URL}/api/studio/chat`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    // Mock the json method
    request.json = async () => requestBody;

    const startTime = Date.now();
    const response = await POST(request);
    const duration = Date.now() - startTime;

    // Check status
    if (response.status !== testCase.expectedStatus) {
      return {
        passed: false,
        error: `Expected status ${testCase.expectedStatus}, got ${response.status}`,
      };
    }

    // Parse response
    const responseData = await response.json();

    // Check expected fields
    if (testCase.expectedFields) {
      const missingFields = testCase.expectedFields.filter(
        field => !(field in responseData)
      );
      if (missingFields.length > 0) {
        return {
          passed: false,
          error: `Missing fields: ${missingFields.join(', ')}`,
          response: responseData,
        };
      }
      console.log(`   ✅ All expected fields present`);
    }

    // Check response structure
    if (responseData.role !== 'assistant') {
      return {
        passed: false,
        error: `Expected role 'assistant', got '${responseData.role}'`,
        response: responseData,
      };
    }

    if (!responseData.content || responseData.content.trim().length === 0) {
      return {
        passed: false,
        error: 'Response content is empty',
        response: responseData,
      };
    }

    console.log(`   ✅ Response: ${responseData.content.substring(0, 150)}...`);

    // Check expected content
    if (testCase.expectedContent) {
      const lowerContent = responseData.content.toLowerCase();
      const hasExpectedContent = testCase.expectedContent.some(content =>
        lowerContent.includes(content.toLowerCase())
      );
      if (!hasExpectedContent) {
        console.log(`   ⚠️  Warning: Expected content not found: ${testCase.expectedContent.join(', ')}`);
      } else {
        console.log(`   ✅ Contains expected content`);
      }
    }

    // Check suggestions
    if (responseData.suggestions && responseData.suggestions.length > 0) {
      console.log(`   ✅ Suggestions: ${responseData.suggestions.length} suggestion(s)`);
      responseData.suggestions.forEach((s: any, i: number) => {
        console.log(`      ${i + 1}. ${s.title}: ${s.description}`);
      });
    }

    // Check tool calls
    if (responseData.toolCalls && responseData.toolCalls.length > 0) {
      console.log(`   ✅ Tool calls: ${responseData.toolCalls.length} call(s)`);
    }

    // Check lifestyle images
    if (responseData.showLifestyleImages) {
      console.log(`   ✅ Lifestyle images enabled`);
    }

    // Check comparison data
    if (responseData.comparison) {
      console.log(`   ✅ Comparison data present`);
    }

    // Check image suggestions
    if (responseData.imageSuggestions) {
      console.log(`   ✅ Image suggestions present`);
    }

    console.log(`   ⏱️  Duration: ${duration}ms`);

    return {
      passed: true,
      response: responseData,
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    return {
      passed: false,
      error: error.message,
    };
  }
}

async function runAPITests() {
  console.log('🚀 Starting Chat API Integration Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const testCase of apiTestCases) {
    const result = await testAPIEndpoint(testCase);
    results.push({ testCase, result });
    
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 API Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${apiTestCases.length}`);

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
runAPITests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

