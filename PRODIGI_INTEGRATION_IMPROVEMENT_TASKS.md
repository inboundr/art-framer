# Prodigi Integration Improvement Tasks

## Overview
This document contains a comprehensive task list for improving our Prodigi integration based on the reverse engineering analysis of their dashboard.

**Related Documents**:
- `PRODIGI_API_COMPREHENSIVE_ANALYSIS.md` - Full API analysis and capabilities
- `PRODIGI_SETUP.md` - Current integration documentation

---

## Phase 1: Foundation & Core Matching (Week 1)
**Priority**: CRITICAL
**Goal**: Match user images to appropriate products automatically

### 1.1 Aspect Ratio Implementation
- [ ] **Task 1.1.1**: Add aspect ratio calculation utility
  - Input: Image dimensions
  - Output: Aspect ratio percentage (height/width * 100)
  - Location: `src/utils/image-utils.ts`

- [ ] **Task 1.1.2**: Create aspect ratio category classifier
  - Portrait: 0-95%
  - Square: 95-105%
  - Landscape: 105%+
  - Location: `src/utils/aspect-ratio.ts`

- [ ] **Task 1.1.3**: Add aspect ratio filter to product queries
  - Use `facet=productAspectRatio,values:95|105`
  - Filter products within 5% tolerance of user image
  - Location: `src/lib/prodigi.ts`

- [ ] **Task 1.1.4**: Display orientation badge in UI
  - Show "Portrait", "Square", or "Landscape" icon
  - Location: `src/components/ProductCard.tsx`

### 1.2 Size Range Filtering
- [ ] **Task 1.2.1**: Create size range selector component
  - Options: 
    - Under 30cm (small)
    - 30-49cm (medium)
    - 50-69cm (medium-large)
    - 70-99cm (large)
    - 100-149cm (extra large)
    - Over 150cm (oversized)
  - Location: `src/components/filters/SizeRangeFilter.tsx`

- [ ] **Task 1.2.2**: Add dimension range filter to API queries
  - Use `facet=maxProductDimensionsMm,values:300|500|700|1000|1500`
  - Location: `src/lib/prodigi.ts`

- [ ] **Task 1.2.3**: Create size visualization guide
  - Show size comparisons with common objects
  - Location: `src/components/SizeGuide.tsx`

- [ ] **Task 1.2.4**: Display actual dimensions on products
  - Show cm and inches
  - Display width x height
  - Location: `src/components/ProductCard.tsx`

### 1.3 Production Location Optimization
- [ ] **Task 1.3.1**: Implement scoring profile in API calls
  - Add `scoringProfile=Boost by production country`
  - Add `scoringParameter=prodCountry-{country}`
  - Location: `src/lib/prodigi.ts`

- [ ] **Task 1.3.2**: Detect user country
  - Use IP geolocation or user settings
  - Default to US
  - Location: `src/hooks/useUserCountry.ts`

- [ ] **Task 1.3.3**: Display SLA on products
  - Show estimated delivery time
  - Badge for "Fast Delivery" (<48 hours SLA)
  - Location: `src/components/ProductCard.tsx`

- [ ] **Task 1.3.4**: Show production countries
  - Display available production locations
  - Highlight local production
  - Location: `src/components/ProductDetails.tsx`

---

## Phase 2: Core Filters (Week 2)
**Priority**: HIGH
**Goal**: Complete frame customization

### 2.1 Frame Type Selection
- [ ] **Task 2.1.1**: Create frame type taxonomy
  - Group frame types by category:
    - No Frame (rolled, stretched canvas)
    - Classic Frame
    - Box Frame
    - Float Frame
    - Ornate Frame
  - Location: `src/lib/frame-types.ts`

- [ ] **Task 2.1.2**: Implement frame type filter
  - Use `facet=frame,count:100`
  - Display grouped options
  - Location: `src/components/filters/FrameTypeFilter.tsx`

- [ ] **Task 2.1.3**: Add frame thickness selection
  - 19mm vs 38mm options
  - Show side-view illustrations
  - Location: `src/components/filters/FrameThicknessFilter.tsx`

- [ ] **Task 2.1.4**: Show representative frame images
  - Get or create frame style mockups
  - Location: `public/images/frames/`

### 2.2 Frame Color Implementation
- [ ] **Task 2.2.1**: Create color swatch component
  - Display color name + visual texture
  - Support 8 colors:
    - Black
    - White
    - Brown
    - Natural
    - Gold
    - Silver
    - Dark Grey
    - Light Grey
  - Location: `src/components/ColorSwatch.tsx`

- [ ] **Task 2.2.2**: Source or create color texture images
  - Option 1: Use Prodigi's textures (if licensed)
  - Option 2: Create our own texture samples
  - Location: `public/images/frame-colors/`

- [ ] **Task 2.2.3**: Implement frame color filter
  - Use `facet=frameColour,count:100`
  - Multi-select with visual swatches
  - Location: `src/components/filters/FrameColorFilter.tsx`

- [ ] **Task 2.2.4**: Add color preview in product mockup
  - Update frame color in real-time preview
  - Location: `src/components/ProductPreview.tsx`

### 2.3 Glaze Selection
- [ ] **Task 2.3.1**: Create glaze information content
  - None: For canvas prints
  - Acrylic/Perspex: Lightweight, shatter-resistant
  - Float Glass: Premium clarity
  - Motheye: Museum-quality, anti-reflective
  - Location: `src/lib/glaze-info.ts`

- [ ] **Task 2.3.2**: Implement glaze filter component
  - Use `facet=glaze,count:100`
  - Include info icons with descriptions
  - Location: `src/components/filters/GlazeFilter.tsx`

- [ ] **Task 2.3.3**: Add glaze comparison images
  - Show visual differences between options
  - Location: `public/images/glaze-comparison/`

- [ ] **Task 2.3.4**: Show glaze selection in product details
  - Display selected glaze type
  - Show price difference
  - Location: `src/components/ProductDetails.tsx`

---

## Phase 3: Advanced Options (Week 3)
**Priority**: MEDIUM-HIGH
**Goal**: Professional-grade customization

### 3.1 Mount/Mat Implementation
- [ ] **Task 3.1.1**: Create mount information content
  - Explain what mounts/mats are
  - Show visual examples
  - Explain thickness differences
  - Location: `src/lib/mount-info.ts`

- [ ] **Task 3.1.2**: Implement mount filter
  - Use `facet=mount,count:100`
  - Options: No mount, 1.4mm, 2.0mm, 2.4mm
  - Location: `src/components/filters/MountFilter.tsx`

- [ ] **Task 3.1.3**: Create mount visualization
  - Show preview with/without mount
  - Visualize border width
  - Location: `src/components/MountPreview.tsx`

- [ ] **Task 3.1.4**: Calculate mount dimensions
  - Determine border width based on thickness
  - Update product preview
  - Location: `src/utils/mount-calculations.ts`

### 3.2 Mount Color Selection
- [ ] **Task 3.2.1**: Implement mount color filter
  - Use `facet=mountColour,count:100`
  - Options: Snow white, Black, Off-white, Navy
  - Location: `src/components/filters/MountColorFilter.tsx`

- [ ] **Task 3.2.2**: Create mount color swatches
  - Visual color samples
  - Location: `src/components/MountColorSwatch.tsx`

- [ ] **Task 3.2.3**: Add color preview with frame
  - Show mount + frame color combination
  - Location: `src/components/ProductPreview.tsx`

### 3.3 Paper Type Selection
- [ ] **Task 3.3.1**: Create paper type taxonomy
  - Group by category:
    - **Canvas**: Standard, Metallic, Recycled
    - **Art Papers**: Enhanced Matte (ema), German Etching (hge), Cold Press Watercolour (cpwp), Standard Art (sap), Budget Art (bap)
    - **Photo Papers**: Lustre (lpp), High Gloss (hpr), Standard (spr), Budget (bpp)
    - **Special Materials**: Gold Foil, Silver Foil, Dibond, Acrylic, Cork, Silk, Glow in the Dark
  - Location: `src/lib/paper-types.ts`

- [ ] **Task 3.3.2**: Create paper descriptions
  - Full name expansions
  - Use case descriptions
  - Premium indicators
  - Location: `src/lib/paper-descriptions.ts`

- [ ] **Task 3.3.3**: Implement paper type filter
  - Use `facet=paperType,count:100`
  - Grouped dropdown by category
  - Show descriptions on hover
  - Location: `src/components/filters/PaperTypeFilter.tsx`

- [ ] **Task 3.3.4**: Add paper type to product display
  - Show full paper name
  - Display characteristics
  - Show premium badge if applicable
  - Location: `src/components/ProductCard.tsx`

- [ ] **Task 3.3.5**: Create paper comparison guide
  - Side-by-side comparison
  - Visual samples
  - Recommendation engine
  - Location: `src/components/PaperComparisonGuide.tsx`

### 3.4 Finish Selection
- [ ] **Task 3.4.1**: Implement finish filter
  - Use `facet=finish,count:100`
  - Options: Gloss, Matte, Lustre
  - Location: `src/components/filters/FinishFilter.tsx`

- [ ] **Task 3.4.2**: Add finish sample images
  - Show visual difference between finishes
  - Location: `public/images/finish-samples/`

- [ ] **Task 3.4.3**: Conditional finish display
  - Only show for applicable paper types
  - Location: `src/components/filters/FinishFilter.tsx`

---

## Phase 4: Enhanced UX (Week 4)
**Priority**: MEDIUM
**Goal**: Guided shopping experience

### 4.1 Progressive Filtering System
- [ ] **Task 4.1.1**: Implement facet count display
  - Show product count for each filter option
  - Update counts as filters are applied
  - Location: `src/components/filters/FacetOption.tsx`

- [ ] **Task 4.1.2**: Disable unavailable options
  - Grey out options with 0 products
  - Show tooltip explaining why disabled
  - Location: `src/components/filters/FilterOption.tsx`

- [ ] **Task 4.1.3**: Create active filter chips
  - Display selected filters as removable chips
  - Click to remove filter
  - Location: `src/components/ActiveFilters.tsx`

- [ ] **Task 4.1.4**: Add "Clear all filters" button
  - Reset all filters to default
  - Location: `src/components/FilterPanel.tsx`

- [ ] **Task 4.1.5**: Show product match counter
  - "X products match your criteria"
  - Update in real-time
  - Location: `src/components/ProductGrid.tsx`

- [ ] **Task 4.1.6**: Implement filter persistence
  - Save filter state in URL params
  - Allow sharing filtered views
  - Location: `src/hooks/useFilterState.ts`

### 4.2 Visual Guides
- [ ] **Task 4.2.1**: Create size comparison tool
  - Show product next to common objects
  - "View in your space" AR option
  - Location: `src/components/SizeComparison.tsx`

- [ ] **Task 4.2.2**: Implement room visualization
  - Upload room photo
  - Overlay product mockup
  - Adjust size/position
  - Location: `src/components/RoomVisualization.tsx`

- [ ] **Task 4.2.3**: Create color harmony guide
  - Suggest frame colors based on image
  - Color wheel visualization
  - Location: `src/components/ColorHarmonyGuide.tsx`

- [ ] **Task 4.2.4**: Build material comparison tool
  - Side-by-side material comparison
  - Filter by use case
  - Location: `src/components/MaterialComparison.tsx`

### 4.3 Smart Recommendations
- [ ] **Task 4.3.1**: Implement recommendation badges
  - "Popular choice"
  - "Best value"
  - "Fastest shipping"
  - "Premium quality"
  - Location: `src/components/ProductBadge.tsx`

- [ ] **Task 4.3.2**: Create recommendation algorithm
  - Factor in: price, SLA, searchWeighting, ratings
  - Location: `src/lib/recommendations.ts`

- [ ] **Task 4.3.3**: Add "Recommended for you" section
  - Based on image characteristics
  - Based on previous selections
  - Location: `src/components/RecommendedProducts.tsx`

### 4.4 Product Details Enhancement
- [ ] **Task 4.4.1**: Display production countries
  - Show flags or country names
  - Highlight local production
  - Location: `src/components/ProductDetails.tsx`

- [ ] **Task 4.4.2**: Show delivery estimates
  - Calculate from SLA
  - Display date range
  - Location: `src/components/DeliveryEstimate.tsx`

- [ ] **Task 4.4.3**: Display optimal DPI
  - Show if user image meets DPI requirement
  - Warning if image resolution is low
  - Location: `src/components/ImageQualityIndicator.tsx`

- [ ] **Task 4.4.4**: Show substrate weight
  - Display paper weight
  - Explain significance
  - Location: `src/components/ProductDetails.tsx`

---

## Phase 5: Advanced Features (Week 5+)
**Priority**: LOW-MEDIUM
**Goal**: Complete parity + innovation

### 5.1 Standard Size Presets
- [ ] **Task 5.1.1**: Create size preset data
  - A-series: A0, A1, A2, A3, A4, A5
  - US standard: 8x10, 11x14, 16x20, 18x24, 24x36
  - Location: `src/lib/standard-sizes.ts`

- [ ] **Task 5.1.2**: Implement quick size selector
  - Button grid for common sizes
  - Location: `src/components/SizePresets.tsx`

- [ ] **Task 5.1.3**: Add custom size input
  - Width and height inputs
  - Unit toggle (cm/inches)
  - Validate against available products
  - Location: `src/components/CustomSizeInput.tsx`

### 5.2 Canvas Wrap Options
- [ ] **Task 5.2.1**: Implement wrap option selector
  - White, Black, Mirror, Image wrap
  - Show preview images
  - Location: `src/components/WrapSelector.tsx`

- [ ] **Task 5.2.2**: Create wrap preview images
  - Show edge treatment examples
  - Location: `public/images/wrap-examples/`

- [ ] **Task 5.2.3**: Add wrap explanation content
  - Describe each wrap type
  - Recommend based on image
  - Location: `src/lib/wrap-info.ts`

### 5.3 Multi-Product Comparison
- [ ] **Task 5.3.1**: Create comparison view
  - Side-by-side product display
  - Compare up to 3 products
  - Location: `src/components/ProductComparison.tsx`

- [ ] **Task 5.3.2**: Implement comparison metrics
  - Price, materials, SLA, size
  - Highlight differences
  - Location: `src/components/ComparisonTable.tsx`

- [ ] **Task 5.3.3**: Add "Compare" button to products
  - Select products to compare
  - Location: `src/components/ProductCard.tsx`

- [ ] **Task 5.3.4**: Create favorites/saved items
  - "Save for later" functionality
  - Local storage or user account
  - Location: `src/hooks/useFavorites.ts`

### 5.4 Filter Presets
- [ ] **Task 5.4.1**: Create preset filter combinations
  - Budget friendly
  - Premium quality
  - Fast delivery
  - Eco-friendly
  - Location: `src/lib/filter-presets.ts`

- [ ] **Task 5.4.2**: Implement preset selector
  - Quick apply preset filters
  - Location: `src/components/FilterPresets.tsx`

- [ ] **Task 5.4.3**: Add custom preset saving
  - Save user's filter combination
  - Name custom presets
  - Location: `src/hooks/useCustomPresets.ts`

---

## Technical Infrastructure

### API Layer Updates
- [ ] **Task API.1**: Extend Prodigi API client
  - Add facet query support
  - Add all filter parameters
  - Type all response fields
  - Location: `src/lib/prodigi.ts`

- [ ] **Task API.2**: Create query builder utility
  - Build OData filter strings
  - Handle complex AND/OR logic
  - Encode parameters properly
  - Location: `src/lib/prodigi-query-builder.ts`

- [ ] **Task API.3**: Implement response parser
  - Parse facet data
  - Transform product data
  - Handle errors gracefully
  - Location: `src/lib/prodigi-response-parser.ts`

- [ ] **Task API.4**: Add caching layer
  - Cache facet data (1 hour)
  - Cache product catalog (6 hours)
  - Implement cache invalidation
  - Location: `src/lib/cache.ts`

### Type Definitions
- [ ] **Task TYPE.1**: Create comprehensive types
  - Product type interfaces
  - Facet response types
  - Filter parameter types
  - Location: `src/types/prodigi.ts`

- [ ] **Task TYPE.2**: Create filter option enums
  - All facet value enums
  - Type-safe filter options
  - Location: `src/types/filters.ts`

### State Management
- [ ] **Task STATE.1**: Implement filter state management
  - Global filter store
  - Sync with URL params
  - Location: `src/contexts/FilterContext.tsx`

- [ ] **Task STATE.2**: Create product state management
  - Product grid state
  - Selected product state
  - Comparison state
  - Location: `src/contexts/ProductContext.tsx`

### Testing
- [ ] **Task TEST.1**: Unit tests for utilities
  - Aspect ratio calculations
  - Query builder
  - Response parser
  - Location: `__tests__/lib/`

- [ ] **Task TEST.2**: Component tests
  - Filter components
  - Product display components
  - Location: `__tests__/components/`

- [ ] **Task TEST.3**: Integration tests
  - Full filter flow
  - Product selection flow
  - Location: `__tests__/integration/`

- [ ] **Task TEST.4**: API mock tests
  - Mock Prodigi responses
  - Test error handling
  - Location: `__tests__/api/`

### Documentation
- [ ] **Task DOC.1**: Update integration docs
  - Document new filter system
  - API usage examples
  - Location: `PRODIGI_SETUP.md`

- [ ] **Task DOC.2**: Create filter guide
  - User-facing filter explanations
  - Best practices
  - Location: `FILTER_GUIDE.md`

- [ ] **Task DOC.3**: Document material options
  - Paper type guide
  - Frame option guide
  - Location: `MATERIAL_OPTIONS.md`

---

## Performance Optimizations

- [ ] **Task PERF.1**: Lazy load filter options
  - Load facets on-demand
  - Progressive enhancement

- [ ] **Task PERF.2**: Optimize image loading
  - Lazy load product images
  - Use WebP format
  - Implement blur-up technique

- [ ] **Task PERF.3**: Debounce filter changes
  - Delay API calls until user stops interacting
  - Show loading state

- [ ] **Task PERF.4**: Implement virtual scrolling
  - For large product grids
  - Improve scroll performance

---

## Migration Tasks

- [ ] **Task MIG.1**: Audit current frame selection
  - Document current functionality
  - Identify breaking changes

- [ ] **Task MIG.2**: Create migration plan
  - Backward compatibility strategy
  - Data migration if needed

- [ ] **Task MIG.3**: Update existing components
  - Refactor to use new filter system
  - Maintain existing features

---

## Quality Assurance

- [ ] **Task QA.1**: Cross-browser testing
  - Test all major browsers
  - Mobile responsive testing

- [ ] **Task QA.2**: Accessibility audit
  - WCAG 2.1 AA compliance
  - Screen reader testing
  - Keyboard navigation

- [ ] **Task QA.3**: Performance testing
  - Lighthouse scores
  - Load time optimization
  - API response time

- [ ] **Task QA.4**: User acceptance testing
  - Internal testing
  - Beta user feedback
  - Iterate based on feedback

---

## Success Metrics & KPIs

### Track These Metrics
- [ ] Product selection time (goal: < 2 minutes)
- [ ] Filter usage rate (goal: > 70%)
- [ ] Cart abandonment rate (goal: < 30%)
- [ ] Average order value (goal: +20%)
- [ ] Customer satisfaction (goal: > 4.5/5)
- [ ] Support tickets (goal: -40%)
- [ ] Conversion rate (goal: +15%)

### Analytics Implementation
- [ ] **Task ANALYTICS.1**: Track filter interactions
  - Which filters are used most
  - Filter combination patterns

- [ ] **Task ANALYTICS.2**: Track product selections
  - Most popular products
  - Price point analysis

- [ ] **Task ANALYTICS.3**: Track user journey
  - Time to purchase
  - Drop-off points

---

## Priority Matrix

### Must Have (Phase 1-2)
- ✅ Aspect ratio filtering
- ✅ Size range filtering
- ✅ Frame type selection
- ✅ Frame color selection
- ✅ Glaze selection
- ✅ Production location optimization

### Should Have (Phase 3)
- ✅ Mount/mat options
- ✅ Paper type selection
- ✅ Finish selection

### Nice to Have (Phase 4-5)
- ✅ Progressive filtering
- ✅ Visual guides
- ✅ Smart recommendations
- ✅ Standard size presets
- ✅ Canvas wrap options
- ✅ Multi-product comparison
- ✅ Filter presets

---

## Estimated Timeline

| Phase | Duration | Total Tasks | Priority |
|-------|----------|-------------|----------|
| Phase 1 | 5-7 days | 13 tasks | CRITICAL |
| Phase 2 | 5-7 days | 12 tasks | HIGH |
| Phase 3 | 7-10 days | 14 tasks | MEDIUM-HIGH |
| Phase 4 | 7-10 days | 16 tasks | MEDIUM |
| Phase 5 | 10-14 days | 12 tasks | LOW-MEDIUM |
| Infrastructure | Ongoing | 14 tasks | HIGH |
| **Total** | **8-10 weeks** | **81+ tasks** | - |

---

## Dependencies

### External Dependencies
- Prodigi API access (already have)
- Frame color textures (need to source or create)
- Material sample images (need to create)
- Room visualization tool (optional, can build later)

### Internal Dependencies
- Design system for filter components
- Image upload/processing flow
- Product preview/mockup system
- Checkout flow integration

---

## Risk Assessment

### High Risk
- ⚠️ API rate limits - need to implement caching
- ⚠️ Performance with many filters - need optimization
- ⚠️ Mobile UX complexity - need progressive disclosure

### Medium Risk
- ⚠️ Color accuracy in previews - need color management
- ⚠️ Size visualization accuracy - need proper scaling
- ⚠️ Filter complexity - might confuse users

### Low Risk
- ⚠️ Backward compatibility - can maintain old flow
- ⚠️ Data migration - minimal data to migrate

### Mitigation Strategies
1. Implement caching early (Phase 1)
2. Progressive enhancement approach
3. A/B test new filter UI
4. Provide guided tour for new users
5. Maintain simplified "Quick Select" mode

---

## Next Actions

### Immediate (This Week)
1. ✅ Review analysis document
2. ⬜ Get team sign-off on priorities
3. ⬜ Create design mockups for Phase 1
4. ⬜ Set up development branch
5. ⬜ Begin Phase 1 Task 1.1.1

### Short Term (Next 2 Weeks)
1. ⬜ Complete Phase 1 implementation
2. ⬜ Begin Phase 2 design
3. ⬜ Set up analytics tracking
4. ⬜ Create testing plan

### Long Term (Next 2 Months)
1. ⬜ Complete Phases 1-3
2. ⬜ Beta testing with users
3. ⬜ Iterate based on feedback
4. ⬜ Plan Phases 4-5

---

**Document Version**: 1.0
**Last Updated**: November 20, 2024
**Status**: Ready for Review
**Total Tasks**: 81+
**Estimated Effort**: 8-10 weeks

