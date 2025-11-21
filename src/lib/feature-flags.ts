/**
 * Feature Flags
 * 
 * Centralized feature flag management
 */

export const featureFlags = {
  /**
   * AI Studio - New AI-powered frame customization experience
   * When enabled, accessible at /studio
   */
  aiStudio: process.env.NEXT_PUBLIC_AI_STUDIO_ENABLED === 'true',
  
  /**
   * Image Generation - Ideogram integration
   */
  imageGeneration: process.env.NEXT_PUBLIC_IMAGE_GENERATION_ENABLED === 'true',
  
  /**
   * Room Visualization - AR and room upload features
   */
  roomVisualization: process.env.NEXT_PUBLIC_ROOM_VIZ_ENABLED === 'true',
  
  /**
   * Voice Input - Voice-to-text in AI chat
   */
  voiceInput: process.env.NEXT_PUBLIC_VOICE_INPUT_ENABLED === 'true',
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

