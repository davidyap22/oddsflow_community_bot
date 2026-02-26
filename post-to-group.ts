/**
 * Post content to a community group discussion (using email/password login)
 *
 * Usage:
 *   npx tsx scripts/post-to-group.ts --list-rooms
 *   npx tsx scripts/post-to-group.ts --room <room_id> --title "Title" --content "Content"
 *   npx tsx scripts/post-to-group.ts --room <room_id> --title "Title" --content "Content" --name "OddsFlow AI" --pin
 *
 * Environment variables in .env.local:
 *   BOT_EMAIL=your-bot@gmail.com
 *   BOT_PASSWORD=your-password
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
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

  if (!roomId || !title || !content) {
    console.error('❌ Required: --room <id> --title "..." --content "..."');
    console.error('   Optional: --name "Bot Name" --type discussion --tags "ai,analysis" --pin');
    process.exit(1);
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
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Post failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Posted to group ${roomId}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Title: ${title}`);
  console.log(`   Author: ${authorName}`);
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
