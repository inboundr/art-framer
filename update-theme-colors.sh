#!/bin/bash

# Bulk update script to replace old dark theme colors with new light theme colors
# This updates all TypeScript/TSX files in the components directory

echo "🎨 Starting theme color migration..."

# Array of files to update
FILES=$(find src/components -name "*.tsx" -o -name "*.ts" | grep -v "__tests__" | grep -v ".test.ts")

# Counter
COUNT=0

for file in $FILES; do
  # Skip if file doesn't exist or is a test file
  if [[ ! -f "$file" ]] || [[ "$file" == *"test"* ]]; then
    continue
  fi
  
  # Check if file contains old theme colors
  if grep -q "bg-dark\|text-foreground\|bg-background\|border-border\|bg-secondary\|text-gray-text\|text-gray-light\|bg-dark-secondary\|bg-dark-tertiary\|border-gray-border" "$file"; then
    echo "📝 Updating: $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Replace dark theme colors with light theme equivalents
    sed -i '' \
      -e 's/bg-dark-tertiary/bg-gray-100/g' \
      -e 's/bg-dark-secondary/bg-white/g' \
      -e 's/bg-dark\([^-]\)/bg-gray-900\1/g' \
      -e 's/bg-dark$/bg-gray-900/g' \
      -e 's/bg-background/bg-gray-50/g' \
      -e 's/text-foreground/text-gray-900/g' \
      -e 's/text-gray-text/text-gray-600/g' \
      -e 's/text-gray-light/text-gray-900/g' \
      -e 's/border-border/border-gray-200/g' \
      -e 's/border-gray-border/border-gray-300/g' \
      -e 's/bg-secondary\([^-]\)/bg-gray-100\1/g' \
      -e 's/bg-secondary$/bg-gray-100/g' \
      -e 's/text-secondary-foreground/text-gray-900/g' \
      -e 's/hover:bg-white\/5/hover:bg-gray-100/g' \
      -e 's/hover:bg-white\/10/hover:bg-gray-200/g' \
      -e 's/bg-white\/10/bg-black/g' \
      -e 's/bg-white\/20/bg-gray-100/g' \
      -e 's/text-white/text-gray-900/g' \
      -e 's/rounded-md/rounded-lg/g' \
      -e 's/text-muted-foreground/text-gray-600/g' \
      "$file"
    
    # Remove backup if no changes
    if diff -q "$file" "$file.bak" > /dev/null; then
      rm "$file.bak"
    else
      rm "$file.bak"
      ((COUNT++))
    fi
  fi
done

echo "✅ Updated $COUNT files"
echo "🎉 Theme migration complete!"

