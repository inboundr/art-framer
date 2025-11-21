/**
 * Quick Options Component
 * Quick toggles for common options
 */

'use client';

import { useStudioStore } from '@/store/studio';

export function QuickOptions() {
  const { config, updateConfig } = useStudioStore();

  const toggles = [
    {
      label: 'Add Mount',
      enabled: config.mount !== 'none',
      onToggle: (enabled: boolean) => {
        updateConfig({ mount: enabled ? '2.4mm' : 'none' });
      },
      description: 'Adds breathing room around your artwork',
    },
    {
      label: 'Premium Glaze',
      enabled: config.glaze === 'motheye' || config.glaze === 'glass',
      onToggle: (enabled: boolean) => {
        updateConfig({ glaze: enabled ? 'motheye' : 'acrylic' });
      },
      description: 'Museum-quality glass with 99% UV protection',
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Quick Options
      </h3>

      <div className="space-y-3">
        {toggles.map((toggle) => (
          <div
            key={toggle.label}
            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {toggle.label}
              </p>
              <p className="text-xs text-gray-600">{toggle.description}</p>
            </div>

            <button
              onClick={() => toggle.onToggle(!toggle.enabled)}
              className={`
                flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black
                ${toggle.enabled ? 'bg-black' : 'bg-gray-300'}
              `}
              aria-label={`Toggle ${toggle.label}`}
            >
              <div
                className={`
                  absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200
                  ${toggle.enabled ? 'left-[26px]' : 'left-0.5'}
                `}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

