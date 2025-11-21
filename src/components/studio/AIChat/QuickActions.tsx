/**
 * Quick Actions Component
 * Provides one-tap common actions
 */

'use client';

import { useStudioStore } from '@/store/studio';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { config } = useStudioStore();
  const hasImage = !!config.imageUrl;

  const actions = hasImage
    ? [
        { label: '🎨 Change color', action: 'Show me different frame colors' },
        { label: '📏 Adjust size', action: 'What sizes are available?' },
        { label: '🏠 See in room', action: 'Show this in my room' },
        { label: '✨ Suggestions', action: 'What improvements do you recommend?' },
      ]
    : [
        { label: '📤 Upload image', action: 'I want to upload my own image' },
        { label: '✨ Generate art', action: 'Generate art for me' },
        { label: '💡 Browse examples', action: 'Show me some examples' },
      ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((item) => (
        <button
          key={item.label}
          onClick={() => onAction(item.action)}
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 rounded-full border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

