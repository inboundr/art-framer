# SKU Migration Guide

## Overview

This guide explains the new, improved approach to handling Prodigi SKUs in the application. Instead of regenerating SKUs on every request (which was slow and complex), we now fix the data once through migration.

## The Problem

The previous approach had several issues:

- **Performance**: Regenerating SKUs on every shipping/checkout request
- **Complexity**: Multiple fallback layers and complex algorithms
- **API Rate Limits**: Too many Prodigi API calls
- **Reliability**: Dependent on external APIs during critical operations

## The Solution

### 1. Database Migration (One-time Fix)

- Identify all invalid SKUs in the database
- Replace them with valid, known working SKUs
- Update the database once

### 2. Simplified Code

- Remove complex fallback logic
- Use stored SKUs directly
- Better performance and reliability

### 3. Future Prevention

- Validate SKUs before storing them
- Use known working SKUs by default

## Files Created/Modified

### New Files:

- `scripts/migrate-invalid-skus.js` - Main migration script
- `scripts/test-migration-approach.js` - Test script
- `src/lib/prodigi-simple.ts` - Simplified Prodigi client
- `src/lib/sku-validation.ts` - SKU validation utilities

### Modified Files:

- `src/app/api/cart/shipping/route.ts` - Removed SKU regeneration
- `src/app/api/checkout/create-session/route.ts` - Removed SKU regeneration

## How to Run the Migration

### 1. Test the Migration Approach

```bash
node scripts/test-migration-approach.js
```

### 2. Run the Migration (Production)

```bash
node scripts/migrate-invalid-skus.js
```

### 3. Verify the Results

The migration script will:

- Find all products with generated SKUs (PRODIGI-\* pattern)
- Validate each SKU with the Prodigi API
- Replace invalid SKUs with valid ones
- Update the database
- Provide a summary of changes

## Migration Process

1. **Discovery**: Find all products with `PRODIGI-*` SKUs
2. **Validation**: Test each SKU with the Prodigi API
3. **Generation**: Create valid SKUs for invalid ones
4. **Update**: Update the database with valid SKUs
5. **Verification**: Confirm all updates were successful

## Known Working SKUs

The migration uses these verified working SKUs:

- **Small frames**: `GLOBAL-FAP-8X10`, `GLOBAL-CAN-10x10`
- **Medium frames**: `GLOBAL-FAP-11X14`, `GLOBAL-CFPM-16X20`
- **Large frames**: `GLOBAL-FAP-16X24`, `GLOBAL-CFPM-16X20`
- **Extra large frames**: `GLOBAL-FRA-CAN-30X40`

## Benefits of New Approach

### Performance

- ✅ **Faster checkout/shipping**: No API calls during critical operations
- ✅ **Reduced latency**: Use stored SKUs directly
- ✅ **Better user experience**: Faster response times

### Reliability

- ✅ **More stable**: Less dependent on external APIs
- ✅ **Fewer failures**: Known working SKUs
- ✅ **Better error handling**: Simpler code paths

### Maintainability

- ✅ **Simpler code**: Removed complex fallback logic
- ✅ **Easier debugging**: Clear, straightforward flow
- ✅ **Better testing**: Fewer edge cases to test

### Cost

- ✅ **Lower API costs**: Fewer Prodigi API calls
- ✅ **Reduced rate limiting**: Less API usage
- ✅ **Better resource usage**: More efficient

## Environment Variables Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Prodigi
PRODIGI_API_KEY=your_prodigi_api_key
```

## Rollback Plan

If needed, you can rollback by:

1. Restoring the previous version of the API files
2. The migration is non-destructive (only updates SKUs)
3. Original SKUs are logged for reference

## Monitoring

After migration, monitor:

- Shipping calculation success rates
- Checkout completion rates
- Prodigi API error rates
- Application performance metrics

## Future Improvements

1. **SKU Validation Middleware**: Automatically validate SKUs before database operations
2. **Background Validation**: Periodically validate SKUs in the background
3. **SKU Caching**: Cache validated SKUs for better performance
4. **Analytics**: Track SKU usage and success rates

## Support

If you encounter issues:

1. Check the migration script logs
2. Verify environment variables
3. Test with the test script first
4. Review the Prodigi API documentation

## Conclusion

This new approach provides a much more robust, performant, and maintainable solution for handling Prodigi SKUs. The one-time migration fixes the data, and the simplified code ensures better performance and reliability going forward.
