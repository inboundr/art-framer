# Configuration Changes Debugging Guide

## Issue
User reports that manual configuration changes don't appear in the chat.

## What Should Happen

When a user manually changes configuration (e.g., size dropdown, frame color, etc.):

1. **Store Update**: `updateConfig()` is called
2. **Change Record Created**: A `ConfigurationChangeData` object is created
3. **Added to Store**: Added to `configurationChanges` array in store
4. **Chat Re-renders**: Chat component receives update via Zustand subscription
5. **Change Displayed**: Blue card appears in chat showing the change

## Debugging Steps

### Step 1: Check Browser Console

Open the studio and browser console. When you change configuration:

**Expected Console Output**:
```
📊 Configuration changes in chat: 1
Latest change: { id: "change-...", timestamp: 1701615600000, changes: { size: "16x20" }, ... }
```

**If you DON'T see this**:
- Configuration changes are not being tracked in the store
- Store subscription is not working

### Step 2: Check Store State

In browser console, run:
```javascript
// Access the store state
const store = window.__ZUSTAND_STORE__; // If exposed
// OR open React DevTools and check useStudioStore state
```

Look for:
- `configurationChanges` array
- Recent items with your changes

**Expected**:
```javascript
configurationChanges: [
  {
    id: "change-1701615600000-abc123",
    timestamp: 1701615600000,
    changes: { size: "16x20" },
    previousConfig: { /* full config */ },
    source: "user"
  }
]
```

### Step 3: Check Chat Rendering

In the chat component, add temporary debug rendering:

```typescript
// In AIChat/index.tsx, before the return statement
console.log('Rendering chat with:', {
  messagesCount: messages.length,
  configChangesCount: configurationChanges.length,
});
```

**Expected**:
- `configChangesCount` should increase when you make changes
- Should match the console logs

### Step 4: Check Combined Array

In the rendering logic, add:

```typescript
{(() => {
  const combined = [
    ...messages.map(m => ({ type: 'message', data: m, timestamp: parseInt(m.id.split('-')[1]) || 0 })),
    ...configurationChanges.map(c => ({ type: 'change', data: c, timestamp: c.timestamp })),
  ];
  
  console.log('Combined items:', combined.length, combined);
  
  combined.sort((a, b) => a.timestamp - b.timestamp);
  
  return combined.map((item) => {
    // ... rendering
  });
})()}
```

**Expected**:
- Combined array should include both messages and changes
- Sorted by timestamp
- Both types should render

## Common Issues

### Issue 1: Store Not Updating

**Symptoms**: No console logs, `configurationChanges` is empty

**Possible Causes**:
- `updateConfig` not being called
- Configuration change creation logic not running
- Store persistence blocking updates

**Fix**:
Check `src/store/studio.ts` line ~327-365:
```typescript
updateConfig: (updates) => {
  set((state) => {
    // ... should create ConfigurationChangeData
    const change: ConfigurationChangeData = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      changes: updates,
      previousConfig,
      source: 'user',
    };
    // ... should add to configurationChanges
  });
},
```

### Issue 2: Chat Not Re-rendering

**Symptoms**: Console shows changes, but chat doesn't update

**Possible Causes**:
- Chat component not subscribed to `configurationChanges`
- React not detecting state change
- Rendering logic broken

**Fix**:
Verify in `src/components/studio/AIChat/index.tsx`:
```typescript
const { configurationChanges } = useStudioStore();

useEffect(() => {
  // This should trigger on every change
  console.log('Changes updated:', configurationChanges);
}, [configurationChanges]);
```

### Issue 3: Empty Changes Array

**Symptoms**: Changes created but array is empty

**Possible Causes**:
- Changes being created but not added to array
- Array being cleared/reset
- Persistence issue

**Fix**:
Check store logic ensures:
```typescript
configurationChanges: [...state.configurationChanges, change].slice(-100),
```

### Issue 4: Wrong Keys/Rendering

**Symptoms**: React key warnings, duplicate keys

**Possible Causes**:
- Change IDs conflicting with message IDs
- Key not unique

**Fix**:
Ensure change IDs are prefixed:
```typescript
id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

And use proper keys in rendering:
```typescript
<ConfigurationChange
  key={change.id}  // Should be unique
  change={change}
  onRevert={revertToConfiguration}
/>
```

## Manual Testing Checklist

- [ ] Open studio in browser
- [ ] Open browser console (F12)
- [ ] Make a manual change (e.g., size dropdown)
- [ ] Check console for "📊 Configuration changes in chat"
- [ ] Check chat for blue configuration change card
- [ ] Verify card shows correct change description
- [ ] Click revert button
- [ ] Verify configuration reverts
- [ ] Verify new "Reverted" entry appears

## Quick Test Component

Add this temporarily to test the store directly:

```typescript
// In src/components/studio/AIChat/index.tsx
// Add at the top of AIChat component:

useEffect(() => {
  // Test: Log every render
  console.log('🔄 AIChat render:', {
    messages: messages.length,
    configChanges: configurationChanges.length,
  });
}, [messages, configurationChanges]);

// Add a test button in the UI:
<button
  onClick={() => {
    console.log('🧪 Test button clicked');
    console.log('Current config changes:', configurationChanges);
    updateConfig({ size: '20x24' });
    console.log('After update:', configurationChanges);
  }}
  className="px-4 py-2 bg-red-500 text-white"
>
  Test: Change Size
</button>
```

## Resolution Steps

If configuration changes still don't appear:

1. **Verify Store Integration**:
   - Check that `configurationChanges` is in store state
   - Check that `updateConfig` adds to the array
   - Check that store persists correctly

2. **Verify Chat Integration**:
   - Check that chat component uses `configurationChanges` from store
   - Check that useEffect triggers on changes
   - Check that rendering logic includes changes

3. **Verify Rendering**:
   - Check that `ConfigurationChange` component renders
   - Check that keys are unique
   - Check that combined array is sorted correctly

4. **Check for Errors**:
   - Browser console for React errors
   - Network tab for API errors
   - React DevTools for component state

## Expected Behavior

**Successful Flow**:

1. User changes size dropdown from "11x14" to "16x20"
2. Console: `📊 Configuration changes in chat: 1`
3. Chat shows:
   ```
   ✏️ Configuration Updated
      Size: 16x20
      Just now                    [↶]
   ```
4. User can continue working or click revert
5. All changes accumulate in chat chronologically

**If this doesn't happen, follow the debugging steps above.**

