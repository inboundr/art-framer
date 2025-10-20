#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function sanitizeSqlString(input) {
  return input.replace(/'/g, "''");
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const publicImagesDir = path.join(projectRoot, 'public-images');
  const seedDir = path.join(projectRoot, 'supabase');
  const seedFile = path.join(seedDir, 'seed.sql');

  if (!fs.existsSync(publicImagesDir)) {
    console.error(`❌ public-images directory not found at ${publicImagesDir}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(publicImagesDir);
  const imageFiles = allFiles.filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  if (imageFiles.length === 0) {
    console.warn('⚠️  No image files found in public-images');
  }

  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir, { recursive: true });
  }

  const lines = [];
  lines.push('-- Auto-generated seed for curated_images from public-images');
  lines.push('-- Note: This only inserts DB rows. Upload files to storage separately.');
  lines.push('');
  lines.push('-- Ensure curated-images bucket exists and is public');
  lines.push("INSERT INTO storage.buckets (id, name, public) VALUES ('curated-images', 'curated-images', true) ON CONFLICT (id) DO NOTHING;");
  lines.push('');
  lines.push('-- Optional: Public read policy for curated-images (idempotent)');
  lines.push("DO $$ BEGIN PERFORM 1 FROM pg_policies WHERE policyname = 'Curated images are publicly accessible' AND tablename = 'objects'; IF NOT FOUND THEN ");
  lines.push("  CREATE POLICY \"Curated images are publicly accessible\" ON storage.objects FOR SELECT USING (bucket_id = 'curated-images');");
  lines.push('END IF; END $$;');
  lines.push('');
  lines.push('-- Insert curated images');

  let displayOrder = 0;
  for (const file of imageFiles) {
    displayOrder += 1;
    const title = sanitizeSqlString(path.basename(file, path.extname(file)));
    const description = sanitizeSqlString(`Curated image ${title}`);
    const category = 'art';
    const tags = '{}';
    // Expected storage paths (to be uploaded by script):
    const imagePath = `images/${file}`;
    const thumbPath = `thumbnails/${file}`;
    const width = 1024; // placeholder
    const height = 1024; // placeholder
    const aspect = 'square';
    const isFeatured = 'false';
    const isActive = 'true';

    lines.push(
      `INSERT INTO public.curated_images (title, description, category, tags, image_url, thumbnail_url, width, height, aspect_ratio, display_order, is_featured, is_active) VALUES (` +
        `'${title}', '${description}', '${category}', '${tags}', '${imagePath}', '${thumbPath}', ${width}, ${height}, '${aspect}', ${displayOrder}, ${isFeatured}, ${isActive}` +
      `) ON CONFLICT DO NOTHING;`
    );
  }

  fs.writeFileSync(seedFile, lines.join('\n') + '\n');
  console.log(`✅ Generated seed at ${seedFile} with ${imageFiles.length} curated_images rows.`);
}

main();


