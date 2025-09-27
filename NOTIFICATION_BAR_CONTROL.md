# 🔔 **NOTIFICATION BAR CONTROL**

## Overview

The notification bar that displays "You reached your Free plan limit" can now be controlled via an environment variable.

## Environment Variable

### `NEXT_PUBLIC_SHOW_NOTIFICATION_BAR`

- **Type**: String (`'true'` or `'false'`)
- **Default**: `'false'` (hidden)
- **Purpose**: Controls the visibility of the notification bar

## Usage

### To Hide the Notification Bar (Default)

```bash
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
```

### To Show the Notification Bar

```bash
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=true
```

## Configuration Files

### 1. `.env.local` (Local Development)

```bash
# UI Configuration
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
```

### 2. `env.example` (Template)

```bash
# UI Configuration
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
```

### 3. `env.template` (Documentation)

```bash
# UI Configuration
# Set to 'true' to show the notification bar, 'false' to hide it
NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
```

## Implementation

The notification bar visibility is controlled in `src/components/AppLayout.tsx`:

```typescript
const [showNotification, setShowNotification] = useState(
  process.env.NEXT_PUBLIC_SHOW_NOTIFICATION_BAR === "true"
);
```

## Deployment

### Development

- Set `NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false` in `.env.local`
- Restart the development server

### Production

- Set `NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false` in your production environment
- Redeploy the application

## Testing

1. **Hide Notification Bar**:

   ```bash
   NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=false
   ```

   - Notification bar should not appear
   - Page should load without the banner

2. **Show Notification Bar**:
   ```bash
   NEXT_PUBLIC_SHOW_NOTIFICATION_BAR=true
   ```

   - Notification bar should appear at the top
   - Banner should be visible with close button

## Notes

- The environment variable is prefixed with `NEXT_PUBLIC_` to make it available in the browser
- Changes require a server restart to take effect
- The variable is case-sensitive (`'true'` not `'True'`)
- Default behavior is to hide the notification bar

---

_Notification Bar Control Documentation_
_Last Updated: $(date)_
