#!/usr/bin/env node

/**
 * Test script for Prodigi CloudEvent webhook
 * This script simulates a Prodigi CloudEvent to test the webhook endpoint
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/prodigi';
const IS_HTTPS = WEBHOOK_URL.startsWith('https://');

// Sample CloudEvent payload based on Prodigi documentation
const sampleCloudEvent = {
  "specversion": "1.0",
  "type": "com.prodigi.order.status.stage.changed#InProgress",
  "source": "https://api.sandbox.prodigi.com/v4.0/Orders/",
  "id": "evt_test_12345",
  "time": new Date().toISOString(),
  "datacontenttype": "application/json",
  "data": {
    "id": "ord_test_12345",
    "created": new Date().toISOString(),
    "status": {
      "stage": "InProgress",
      "issues": [],
      "details": {
        "downloadAssets": "InProgress",
        "printReadyAssetsPrepared": "NotStarted",
        "allocateProductionLocation": "NotStarted",
        "inProduction": "NotStarted",
        "shipping": "NotStarted"
      }
    },
    "shipments": [],
    "merchantReference": "TEST_ORDER_123"
  },
  "subject": "ord_test_12345"
};

// Sample CloudEvent for order completion
const completedCloudEvent = {
  "specversion": "1.0",
  "type": "com.prodigi.order.status.stage.changed#Complete",
  "source": "https://api.sandbox.prodigi.com/v4.0/Orders/",
  "id": "evt_test_67890",
  "time": new Date().toISOString(),
  "datacontenttype": "application/json",
  "data": {
    "id": "ord_test_12345",
    "created": new Date().toISOString(),
    "status": {
      "stage": "Complete",
      "issues": [],
      "details": {
        "downloadAssets": "Complete",
        "printReadyAssetsPrepared": "Complete",
        "allocateProductionLocation": "Complete",
        "inProduction": "Complete",
        "shipping": "Complete"
      }
    },
    "shipments": [
      {
        "id": "shp_test_123",
        "status": "Shipped",
        "carrier": {
          "name": "royalmail",
          "service": "Standard"
        },
        "tracking": {
          "url": "https://www.royalmail.com/track-your-item#/tracking-results/test-tracking-123",
          "number": "test-tracking-123"
        },
        "dispatchDate": new Date().toISOString()
      }
    ],
    "merchantReference": "TEST_ORDER_123"
  },
  "subject": "ord_test_12345"
};

async function sendWebhook(payload, description) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (IS_HTTPS ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Prodigi-Webhook-Test/1.0'
      }
    };

    const client = IS_HTTPS ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          description
        });
      });
    });

    req.on('error', (err) => {
      reject({ error: err, description });
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function testWebhook() {
  console.log('🧪 Testing Prodigi CloudEvent Webhook');
  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);
  console.log('');

  try {
    // Test 1: InProgress CloudEvent
    console.log('📤 Test 1: Sending InProgress CloudEvent...');
    const result1 = await sendWebhook(sampleCloudEvent, 'InProgress CloudEvent');
    console.log(`✅ Status: ${result1.statusCode}`);
    console.log(`📝 Response: ${result1.body}`);
    console.log('');

    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Complete CloudEvent with shipment
    console.log('📤 Test 2: Sending Complete CloudEvent with shipment...');
    const result2 = await sendWebhook(completedCloudEvent, 'Complete CloudEvent');
    console.log(`✅ Status: ${result2.statusCode}`);
    console.log(`📝 Response: ${result2.body}`);
    console.log('');

    // Test 3: Invalid source (should fail)
    console.log('📤 Test 3: Testing invalid source (should fail)...');
    const invalidEvent = { ...sampleCloudEvent, source: 'https://malicious-site.com/fake' };
    const result3 = await sendWebhook(invalidEvent, 'Invalid source');
    console.log(`❌ Status: ${result3.statusCode} (Expected: 401)`);
    console.log(`📝 Response: ${result3.body}`);
    console.log('');

    // Test 4: Invalid content type (should fail)
    console.log('📤 Test 4: Testing invalid content type (should fail)...');
    const invalidContentType = { ...sampleCloudEvent, datacontenttype: 'text/plain' };
    const result4 = await sendWebhook(invalidContentType, 'Invalid content type');
    console.log(`❌ Status: ${result4.statusCode} (Expected: 400)`);
    console.log(`📝 Response: ${result4.body}`);
    console.log('');

    console.log('🎉 Webhook testing completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   ✅ Valid CloudEvents: ${result1.statusCode === 200 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Invalid source: ${result3.statusCode === 401 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Invalid content type: ${result4.statusCode === 400 ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testWebhook().catch(console.error);
}

module.exports = { testWebhook, sampleCloudEvent, completedCloudEvent };
