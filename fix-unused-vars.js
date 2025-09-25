#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of common unused variable patterns to fix
const fixes = [
  // Remove unused imports
  { pattern: /import.*useEffect.*from 'react';/, replacement: "import { useState } from 'react';" },
  
  // Comment out unused destructuring
  { pattern: /const { ([^}]+) } = ([^;]+);/, replacement: (match, p1, p2) => {
    const vars = p1.split(',').map(v => v.trim());
    const unusedVars = ['theme', 'isDark', 'getAdaptiveColor', 'animatePreset', 'staggeredAnimate', 'isNarrow', 'isMedium', 'isWide'];
    const usedVars = vars.filter(v => !unusedVars.includes(v));
    
    if (usedVars.length === 0) {
      return `// const { ${p1} } = ${p2}; // Unused for now`;
    } else if (usedVars.length < vars.length) {
      return `const { ${usedVars.join(', ')} } = ${p2}; // Removed unused: ${vars.filter(v => unusedVars.includes(v)).join(', ')}`;
    }
    return match;
  }},
  
  // Comment out unused variable assignments
  { pattern: /const (width|error|operation|payload|orderId|metrics|uploadData) = ([^;]+);/, replacement: "// const $1 = $2; // Unused for now" },
  
  // Comment out unused parameters
  { pattern: /\((props|err|_frameMaterial|dark)\)/, replacement: "(_$1)" },
];

// Files to process (most critical ones)
const filesToFix = [
  'src/components/DynamicImageGallery.tsx',
  'src/components/DynamicImageGalleryLazy.tsx', 
  'src/components/DynamicThemeProvider.tsx',
  'src/components/FramePreview.tsx',
  'src/components/FrameSelector.tsx',
  'src/components/GenerationPanel.tsx',
  'src/components/ImageGallery.tsx',
  'src/lib/prodigi.ts',
  'src/lib/pricing.ts',
  'src/lib/supabase/images.ts'
];

console.log('🔧 Fixing unused variables...');

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed: ${filePath}`);
    }
  }
});

console.log('✨ Done!');
