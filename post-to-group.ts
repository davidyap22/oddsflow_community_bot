/**
 * Post content to a community group discussion (using anon key + RPC)
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
 *   BOT_API_KEY=xxx  (from bot_api_keys table)
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
const BOT_API_KEY = process.env.BOT_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
if (!BOT_API_KEY) {
  console.error('Missing BOT_API_KEY in .env.local (run SELECT api_key FROM bot_api_keys)');
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

async function listAllRooms() {
  const { data, error } = await supabase
    .from('community_groups')
    .select('id, slug, member_count')
    .eq('status', 'active')
    .order('member_count', { ascending: false });

  if (error) { console.error('Error:', error.message); return; }

  console.log(`\nActive groups (${data.length}):\n`);
  console.log(`  ${'SLUG'.padEnd(30)}  MEMBERS`);
  console.log(`  ${'----'.padEnd(30)}  -------`);
  for (const g of data) {
    console.log(`  ${g.slug.padEnd(30)}  ${g.member_count}`);
  }
  console.log(`\nUsage: npx tsx post-to-group.ts --room <SLUG> --title "..." --content "..."\n`);
}

async function createPost() {
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

  // Build metadata with image URLs if provided
  const metadata: Record<string, unknown> = {};
  if (imagePaths.length > 0) {
    // For image upload, read files and encode as base64 URLs
    // (actual Storage upload requires auth; images can also be external URLs)
    const imageUrls: string[] = [];
    for (const imgPath of imagePaths) {
      const absPath = path.resolve(imgPath);
      if (!fs.existsSync(absPath)) {
        console.error(`   Warning: Image not found: ${absPath}, skipping`);
        continue;
      }
      // If it's a URL (starts with http), use directly
      if (imgPath.startsWith('http')) {
        imageUrls.push(imgPath);
      } else {
        console.error(`   Warning: Local image upload not supported without service role key.`);
        console.error(`   Use external image URLs instead: --images https://example.com/img.jpg`);
      }
    }
    if (imageUrls.length > 0) {
      metadata.images = imageUrls;
    }
  }

  // Call RPC function (bypasses RLS via SECURITY DEFINER)
  const { data, error } = await supabase.rpc('create_bot_post', {
    p_api_key: BOT_API_KEY,
    p_room_id: roomId,
    p_title: title,
    p_content: content,
    p_author_name: authorName,
    p_content_type: contentType,
    p_tags: tags,
    p_is_pinned: pin,
    p_metadata: metadata,
  });

  if (error) {
    console.error('Post failed:', error.message);
    process.exit(1);
  }

  console.log(`\nPosted to group ${roomId}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Title: ${title}`);
  console.log(`   Author: ${authorName}`);
  if (pin) console.log(`   Pinned`);
}

async function main() {
  if (listRooms) {
    await listAllRooms();
  } else {
    await createPost();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
