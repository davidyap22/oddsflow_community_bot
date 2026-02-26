/**
 * Post content to a community group discussion (using email/password login)
 *
 * Usage:
 *   npx tsx post-to-group.ts --list-rooms
 *   npx tsx post-to-group.ts --room <room_id> --title "Title" --content "Content"
 *   npx tsx post-to-group.ts --room <room_id> --title "Title" --content "Content" --images img1.jpg img2.png
 *   npx tsx post-to-group.ts --room <room_id> --title "Title" --content "Content" --name "OddsFlow AI" --pin
 *
 * Environment variables in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
 *   BOT_EMAIL=your-bot@gmail.com
 *   BOT_PASSWORD=your-password
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local (look in current dir first, then parent)
const envPaths = [path.join(__dirname, '.env.local'), path.join(__dirname, '..', '.env.local')];
for (const ep of envPaths) {
  if (!fs.existsSync(ep)) continue;
  for (const line of fs.readFileSync(ep, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BOT_EMAIL = process.env.BOT_EMAIL!;
const BOT_PASSWORD = process.env.BOT_PASSWORD!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
if (!BOT_EMAIL || !BOT_PASSWORD) {
  console.error('❌ Missing BOT_EMAIL or BOT_PASSWORD in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
function getArgList(name: string): string[] {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return [];
  const values: string[] = [];
  for (let i = idx + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break;
    values.push(args[i]);
  }
  return values;
}
const listRooms = args.includes('--list-rooms');
const pin = args.includes('--pin');

async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: BOT_EMAIL,
    password: BOT_PASSWORD,
  });
  if (error || !data.user) {
    console.error('❌ Login failed:', error?.message);
    process.exit(1);
  }
  console.log(`✅ Logged in as ${data.user.email} (${data.user.id})`);
  return data.user;
}

async function uploadImages(imagePaths: string[], roomId: string): Promise<string[]> {
  const urls: string[] = [];
  for (const imgPath of imagePaths) {
    const absPath = path.resolve(imgPath);
    if (!fs.existsSync(absPath)) {
      console.error(`   ⚠ Image not found: ${absPath}, skipping`);
      continue;
    }

    const fileBuffer = fs.readFileSync(absPath);
    const ext = path.extname(absPath).slice(1) || 'jpg';
    const storagePath = `posts/${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    };
    const contentType = contentTypeMap[ext.toLowerCase()] || 'image/jpeg';

    const { error } = await supabase.storage
      .from('community-posts')
      .upload(storagePath, fileBuffer, { contentType, cacheControl: '3600', upsert: false });

    if (error) {
      console.error(`   ⚠ Upload failed for ${imgPath}:`, error.message);
      continue;
    }

    const { data: urlData } = supabase.storage.from('community-posts').getPublicUrl(storagePath);
    if (urlData?.publicUrl) {
      urls.push(urlData.publicUrl);
      console.log(`   📷 Uploaded: ${path.basename(absPath)} → ${urlData.publicUrl}`);
    }
  }
  return urls;
}

async function listAllRooms() {
  const { data, error } = await supabase
    .from('community_groups')
    .select('id, slug, member_count')
    .eq('status', 'active')
    .order('member_count', { ascending: false });

  if (error) { console.error('❌', error.message); return; }

  console.log(`\n📋 Active groups (${data.length}):\n`);
  for (const g of data) {
    console.log(`  ${g.id}  ${g.slug}  (${g.member_count} members)`);
  }
  console.log('');
}

async function createPost(userId: string) {
  const roomId = getArg('room');
  const title = getArg('title');
  const content = getArg('content');
  const authorName = getArg('name') || 'Oddsflow';
  const contentType = getArg('type') || 'discussion';
  const tagsRaw = getArg('tags');
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];
  const imagePaths = getArgList('images');

  if (!roomId || !title || !content) {
    console.error('Usage: npx tsx post-to-group.ts --room <id> --title "..." --content "..."');
    console.error('Optional: --images img1.jpg img2.png --name "Bot" --tags "ai,news" --pin');
    process.exit(1);
  }

  // Upload images if provided
  let imageUrls: string[] = [];
  if (imagePaths.length > 0) {
    console.log(`\n📷 Uploading ${imagePaths.length} image(s)...`);
    imageUrls = await uploadImages(imagePaths, roomId);
  }

  const metadata: Record<string, unknown> = {};
  if (imageUrls.length > 0) {
    metadata.images = imageUrls;
  }

  const { data, error } = await supabase
    .from('community_room_posts')
    .insert({
      room_id: roomId,
      author_id: userId,
      author_name: authorName,
      author_avatar: null,
      author_type: 'ai',
      title,
      content,
      content_type: contentType,
      tags,
      is_pinned: pin,
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Post failed:', error.message);
    process.exit(1);
  }

  console.log(`\n✅ Posted to group ${roomId}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Title: ${title}`);
  console.log(`   Author: ${authorName}`);
  if (imageUrls.length > 0) console.log(`   Images: ${imageUrls.length}`);
  if (pin) console.log(`   📌 Pinned`);
}

async function main() {
  const user = await login();

  if (listRooms) {
    await listAllRooms();
  } else {
    await createPost(user.id);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
