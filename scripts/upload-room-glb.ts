/**
 * Script to upload room GLB file to Supabase storage
 * 
 * Usage:
 *   npx tsx scripts/upload-room-glb.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://irugsjzjqdxulliobuwt.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_P57W8qzt7EoPQPkGqX8piA_FXINp1nu';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const BUCKET_NAME = 'prodigi-assets';

async function uploadGLB() {
  console.log('🚀 Uploading room GLB file to Supabase...\n');

  const glbPath = path.join(process.cwd(), 'public', 'samples', 'rooms', 'cozy-living-room-baked', 'cozy_living_room_baked.glb');
  
  if (!fs.existsSync(glbPath)) {
    console.error(`❌ GLB file not found: ${glbPath}`);
    process.exit(1);
  }

  const storagePath = 'samples/rooms/cozy-living-room-baked/cozy_living_room_baked.glb';
  
  console.log(`📦 File size: ${(fs.statSync(glbPath).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📤 Uploading to: ${storagePath}\n`);

  try {
    const fileContent = fs.readFileSync(glbPath);
    const fileBuffer = Buffer.from(fileContent);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'model/gltf-binary',
        upsert: true,
      });

    if (error) {
      console.error(`❌ Failed to upload:`, error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully uploaded: ${storagePath}`);
    console.log(`\n🔗 Public URL: ${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`);
  } catch (error) {
    console.error(`❌ Error:`, error);
    process.exit(1);
  }
}

uploadGLB();

