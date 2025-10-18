# Cart Functionality Tests

This directory contains comprehensive tests for the cart functionality in the Art Framer application. These tests ensure that the cart system works correctly and doesn't break when changes are made.

## Test Structure

### Test Files

- **`test-utils.ts`** - Common utilities and mocks for testing
- **`cart-functionality.test.ts`** - Core cart API and functionality tests
- **`products-api.test.ts`** - Product creation and management API tests
- **`creations-modal.test.tsx`** - CreationsModal component tests
- **`cart-integration.test.ts`** - End-to-end integration tests
- **`cart-test-config.js`** - Jest configuration for cart tests
- **`cart-test-setup.js`** - Additional setup for cart tests
- **`run-cart-tests.js`** - Test runner script

### Test Categories

1. **API Tests** - Test all cart and product API endpoints
2. **Component Tests** - Test React components that interact with cart
3. **Integration Tests** - Test complete user flows from image to cart
4. **Error Handling Tests** - Test error scenarios and edge cases
5. **Concurrency Tests** - Test concurrent operations and race conditions

## Running Tests

### Run All Cart Tests

```bash
npm run test:cart
```

### Run Cart Tests in Watch Mode

```bash
npm run test:cart:watch
```

### Run Cart Tests with Coverage

```bash
npm run test:cart:coverage
```

### Run Specific Test Files

```bash
# Run only cart functionality tests
npm test -- __tests__/cart-functionality.test.ts

# Run only component tests
npm test -- __tests__/creations-modal.test.tsx

# Run only integration tests
npm test -- __tests__/cart-integration.test.ts
```

## Test Coverage

The tests cover:

- ✅ Cart API endpoints (GET, POST)
- ✅ Product creation APIs (regular and curated)
- ✅ CreationsModal component functionality
- ✅ User authentication and authorization
- ✅ Error handling and edge cases
- ✅ Data validation and integrity
- ✅ Concurrent operations
- ✅ Network error handling
- ✅ Malformed request handling

## Key Test Scenarios

### 1. User Image to Cart Flow

- User generates an image
- User clicks "Buy as Frame" in CreationsModal
- System creates product via `/api/products`
- System adds product to cart via `/api/cart`
- User can view cart contents

### 2. Curated Image to Cart Flow

- User views curated image gallery
- User clicks "Buy as Frame" on curated image
- System creates product via `/api/curated-products`
- System adds product to cart via `/api/cart`
- User can view cart contents

### 3. Error Scenarios

- Invalid image ID
- Missing authentication
- Database errors
- Network failures
- Malformed requests
- Concurrent operations

### 4. Edge Cases

- Maximum quantity limits
- Duplicate products
- Incomplete images
- Missing image data
- Invalid frame configurations

## Mock Data

The tests use comprehensive mock data including:

- **Users** - Authenticated and unauthenticated users
- **Images** - User-generated and curated images
- **Products** - Various frame configurations
- **Cart Items** - Different quantities and states
- **API Responses** - Success and error scenarios

## Test Utilities

### `createMockRequest(method, body, searchParams, headers)`

Creates a mock NextRequest for API testing.

### `createMockSupabaseClient(overrides)`

Creates a mock Supabase client with customizable responses.

### `setupTestEnvironment()`

Sets up the test environment with mocks and configurations.

### `cleanupTestEnvironment()`

Cleans up after tests to prevent interference.

## Continuous Integration

These tests are designed to run in CI environments and include:

- **Timeout handling** - Tests have appropriate timeouts
- **Error isolation** - Tests don't interfere with each other
- **Mock cleanup** - All mocks are properly cleaned up
- **Environment setup** - Tests work in various environments

## Debugging Tests

### Enable Verbose Logging

```bash
npm run test:cart -- --verbose
```

### Run Single Test

```bash
npm test -- --testNamePattern="should add item to cart successfully"
```

### Debug Mode

```bash
npm test -- --detectOpenHandles --forceExit
```

## Test Maintenance

### Adding New Tests

1. Create test file in `__tests__/` directory
2. Follow naming convention: `*.test.ts` or `*.test.tsx`
3. Import utilities from `test-utils.ts`
4. Use appropriate mocks and setup
5. Clean up after tests

### Updating Existing Tests

1. Update mock data as needed
2. Ensure tests still pass after changes
3. Update documentation if test behavior changes
4. Run full test suite to ensure no regressions

## Common Issues

### Test Failures

- Check mock data matches expected format
- Verify API endpoints are properly mocked
- Ensure cleanup is happening between tests
- Check for timing issues in async tests

### Performance Issues

- Use `--maxWorkers=1` for debugging
- Check for memory leaks in long-running tests
- Ensure proper cleanup of resources

### Mock Issues

- Verify mock functions are properly reset
- Check that mock implementations match real behavior
- Ensure mocks are applied before imports

## Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Always clean up after tests
3. **Mocking** - Mock external dependencies appropriately
4. **Coverage** - Aim for high test coverage
5. **Documentation** - Keep tests well-documented
6. **Maintenance** - Update tests when code changes
7. **Performance** - Keep tests fast and efficient

## Contributing

When adding new cart functionality:

1. **Write tests first** - Follow TDD approach
2. **Test edge cases** - Don't just test happy paths
3. **Mock external services** - Don't rely on real APIs
4. **Update documentation** - Keep this README current
5. **Run full suite** - Ensure no regressions

## Support

For issues with tests:

1. Check the test output for specific error messages
2. Verify mock data and setup
3. Ensure all dependencies are properly mocked
4. Check for timing issues in async operations
5. Review test isolation and cleanup
