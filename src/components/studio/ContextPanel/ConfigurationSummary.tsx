/**
 * Configuration Summary Component
 * Shows current frame configuration with inline editing
 */

'use client';

import { useStudioStore } from '@/store/studio';

export function ConfigurationSummary() {
  const { config, updateConfig } = useStudioStore();

  const options = [
    {
      label: '🖼️ Size',
      value: config.size,
      key: 'size',
      editable: true,
      options: ['8x10', '11x14', '16x20', '18x24', '20x24', '20x30', '24x30', '24x36', '30x40', '36x48'],
    },
    {
      label: '🎨 Frame Color',
      value: config.frameColor,
      key: 'frameColor',
      editable: true,
      options: ['black', 'white', 'natural', 'brown', 'gold', 'silver', 'dark grey', 'light grey'],
    },
    {
      label: '✨ Frame Style',
      value: config.frameStyle,
      key: 'frameStyle',
      editable: true,
      options: ['classic', 'modern', 'ornate', 'minimal'],
    },
    {
      label: '💎 Glaze',
      value: config.glaze,
      key: 'glaze',
      editable: true,
      options: ['none', 'acrylic', 'glass', 'motheye'],
    },
    {
      label: '📄 Mount',
      value: config.mount,
      key: 'mount',
      editable: true,
      options: ['none', '1.4mm', '2.0mm', '2.4mm'],
    },
  ];

  if (config.mount && config.mount !== 'none') {
    options.push({
      label: '🎨 Mount Color',
      value: config.mountColor,
      key: 'mountColor',
      editable: true,
      options: ['white', 'off-white', 'cream', 'black'],
    });
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Configuration
      </h3>
      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <span className="text-sm font-medium text-gray-700">{option.label}</span>
            {option.editable ? (
              <select
                value={option.value}
                onChange={(e) => updateConfig({ [option.key]: e.target.value })}
                className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer capitalize hover:border-gray-400 transition-colors"
              >
                {option.options?.map((opt) => (
                  <option key={opt} value={opt} className="capitalize bg-white text-gray-900">
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-semibold text-gray-900 capitalize">
                {option.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

