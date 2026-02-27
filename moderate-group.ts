/**
 * Community moderation CLI — approve/reject posts, manage group admins
 *
 * Usage:
 *   npx tsx moderate-group.ts --key <KEY> --pending                          # List all pending posts
 *   npx tsx moderate-group.ts --key <KEY> --pending --room <slug>            # Pending posts for one group
 *   npx tsx moderate-group.ts --key <KEY> --approve <POST_UUID>              # Approve a post
 *   npx tsx moderate-group.ts --key <KEY> --reject <POST_UUID> --reason "x"  # Reject with reason
 *   npx tsx moderate-group.ts --key <KEY> --admins --room <slug>             # List group admins
 *   npx tsx moderate-group.ts --key <KEY> --invite-admin user@email.com --room <slug>
 *   npx tsx moderate-group.ts --key <KEY> --remove-admin user@email.com --room <slug>
 *
 * Environment variables in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string): string | null {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : null;
}

const apiKey = getArg('key');
const roomSlug = getArg('room');
const showPending = args.includes('--pending');
const approveId = getArg('approve');
const rejectId = getArg('reject');
const rejectReason = getArg('reason');
const showAdmins = args.includes('--admins');
const inviteAdminEmail = getArg('invite-admin');
const removeAdminEmail = getArg('remove-admin');
const createGroup = args.includes('--create-group');
const groupName = getArg('name');
const groupDesc = getArg('desc');
const groupType = getArg('type') || 'team';
const groupLeague = getArg('league');
const groupVisibility = getArg('visibility') || 'public';
const groupBanner = getArg('banner');
const groupLogo = getArg('logo');
const groupRules = getArg('rules');

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================
// Command: --pending
// ============================================================
async function listPending() {
  if (!apiKey) { console.error('Error: --key is required'); process.exit(1); }

  const { data, error } = await supabase.rpc('get_pending_posts', {
    p_api_key: apiKey,
    p_room_slug: roomSlug || null,
  });

  if (error) { console.error('Error:', error.message); process.exit(1); }

  const posts = data as Array<{
    id: string; room_id: string; author_name: string; title: string;
    preview: string; created_at: string; author_type: string; group_slug: string;
  }>;

  if (!posts || posts.length === 0) {
    console.log('\nNo pending posts.\n');
    return;
  }

  console.log(`\nPending posts (${posts.length}):\n`);
  posts.forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.group_slug}] "${p.title}" by ${p.author_name} (${timeAgo(p.created_at)})`);
    console.log(`     ID: ${p.id}`);
    console.log(`     Preview: ${p.preview?.slice(0, 100)}${(p.preview?.length || 0) > 100 ? '...' : ''}`);
    console.log();
  });
}

// ============================================================
// Command: --approve / --reject
// ============================================================
async function moderatePost(postId: string, action: 'approve' | 'reject') {
  if (!apiKey) { console.error('Error: --key is required'); process.exit(1); }

  const { data, error } = await supabase.rpc('moderate_post', {
    p_api_key: apiKey,
    p_post_id: postId,
    p_action: action,
    p_reason: action === 'reject' ? (rejectReason || null) : null,
  });

  if (error) { console.error('Error:', error.message); process.exit(1); }

  const result = data as { post_id: string; action: string; status: string };

  if (action === 'approve') {
    console.log(`\nPost approved: ${result.post_id}`);
    console.log('Post is now visible to all group members.\n');
  } else {
    console.log(`\nPost rejected: ${result.post_id}`);
    if (rejectReason) console.log(`Reason: "${rejectReason}"`);
    console.log('Author will see the rejection reason.\n');
  }
}

// ============================================================
// Command: --admins
// ============================================================
async function listAdmins() {
  if (!apiKey) { console.error('Error: --key is required'); process.exit(1); }
  if (!roomSlug) { console.error('Error: --room is required'); process.exit(1); }

  const { data, error } = await supabase.rpc('list_group_admins', {
    p_api_key: apiKey,
    p_group_slug: roomSlug,
  });

  if (error) { console.error('Error:', error.message); process.exit(1); }

  const admins = data as Array<{
    user_id: string; display_name: string; role: string; joined_at: string; email: string;
  }>;

  if (!admins || admins.length === 0) {
    console.log(`\nNo admins found for group "${roomSlug}".\n`);
    return;
  }

  console.log(`\nAdmins for "${roomSlug}" (${admins.length}):\n`);
  console.log(`  ${'NAME'.padEnd(25)}  ${'ROLE'.padEnd(8)}  ${'EMAIL'.padEnd(30)}  JOINED`);
  console.log(`  ${'----'.padEnd(25)}  ${'----'.padEnd(8)}  ${'-----'.padEnd(30)}  ------`);
  for (const a of admins) {
    console.log(`  ${a.display_name.padEnd(25)}  ${a.role.padEnd(8)}  ${a.email.padEnd(30)}  ${new Date(a.joined_at).toLocaleDateString()}`);
  }
  console.log();
}

// ============================================================
// Command: --invite-admin
// ============================================================
async function inviteAdmin() {
  if (!apiKey) { console.error('Error: --key is required'); process.exit(1); }
  if (!roomSlug) { console.error('Error: --room is required'); process.exit(1); }
  if (!inviteAdminEmail) { console.error('Error: email is required'); process.exit(1); }

  const { data, error } = await supabase.rpc('invite_group_admin', {
    p_api_key: apiKey,
    p_group_slug: roomSlug,
    p_target_email: inviteAdminEmail,
  });

  if (error) { console.error('Error:', error.message); process.exit(1); }

  const result = data as { group_slug: string; target_email: string; role: string; action: string };
  console.log(`\nAdmin ${result.action}: ${result.target_email} → ${result.role} in "${result.group_slug}"\n`);
}

// ============================================================
// Command: --remove-admin
// ============================================================
async function removeAdmin() {
  if (!apiKey) { console.error('Error: --key is required'); process.exit(1); }
  if (!roomSlug) { console.error('Error: --room is required'); process.exit(1); }
  if (!removeAdminEmail) { console.error('Error: email is required'); process.exit(1); }

  const { data, error } = await supabase.rpc('remove_group_admin', {
    p_api_key: apiKey,
    p_group_slug: roomSlug,
    p_target_email: removeAdminEmail,
  });

  if (error) { console.error('Error:', error.message); process.exit(1); }

  const result = data as { group_slug: string; target_email: string; role: string; action: string };
  console.log(`\nAdmin ${result.action}: ${result.target_email} → ${result.role} in "${result.group_slug}"\n`);
}

// ============================================================
// Command: --create-group
// ============================================================
async function handleCreateGroup() {
  if (!apiKey) { console.error('Error: --key is required'); process.exit(1); }
  if (!groupName) { console.error('Error: --name is required'); process.exit(1); }

  // Build logo JSONB if provided
  let logoObj: Record<string, string> | null = null;
  if (groupLogo) {
    logoObj = { _profile: groupLogo };
  }

  const { data, error } = await supabase.rpc('create_bot_group', {
    p_api_key: apiKey,
    p_name: groupName,
    p_description: groupDesc || '',
    p_type: groupType,
    p_league_name: groupLeague || null,
    p_visibility: groupVisibility,
    p_image_url: groupBanner || null,
    p_logo: logoObj,
    p_rules: groupRules || null,
  });

  if (error) { console.error('Error:', error.message); process.exit(1); }

  const result = data as {
    id: string; slug: string; name: string;
    creator_name: string; league_name: string | null; visibility: string;
  };

  console.log(`\nGroup created successfully!\n`);
  console.log(`  Name:       ${result.name}`);
  console.log(`  Slug:       ${result.slug}`);
  console.log(`  ID:         ${result.id}`);
  console.log(`  League:     ${result.league_name || '(none)'}`);
  console.log(`  Visibility: ${result.visibility}`);
  console.log(`  Owner:      ${result.creator_name}`);
  console.log(`\n  You are automatically the owner of this group.\n`);
}

// ============================================================
// Main — detect command and dispatch
// ============================================================
async function main() {
  if (createGroup) return handleCreateGroup();
  if (showPending) return listPending();
  if (approveId) return moderatePost(approveId, 'approve');
  if (rejectId) return moderatePost(rejectId, 'reject');
  if (showAdmins) return listAdmins();
  if (inviteAdminEmail) return inviteAdmin();
  if (removeAdminEmail) return removeAdmin();

  // Help
  console.log(`
Usage:
  npx tsx moderate-group.ts --key <KEY> --create-group --name "Group Name" [options]
  npx tsx moderate-group.ts --key <KEY> --pending                          # List pending posts
  npx tsx moderate-group.ts --key <KEY> --pending --room <slug>            # Pending for one group
  npx tsx moderate-group.ts --key <KEY> --approve <POST_UUID>              # Approve a post
  npx tsx moderate-group.ts --key <KEY> --reject <POST_UUID> --reason "x"  # Reject with reason
  npx tsx moderate-group.ts --key <KEY> --admins --room <slug>             # List group admins
  npx tsx moderate-group.ts --key <KEY> --invite-admin user@email.com --room <slug>
  npx tsx moderate-group.ts --key <KEY> --remove-admin user@email.com --room <slug>

Create Group options:
  --name "Group Name"          Required. Group display name
  --desc "Description"         Optional. Group description
  --type team|agent            Optional. Default: team
  --league "EPL"               Optional. League name (EPL, La Liga, Bundesliga, Serie A, Ligue 1, UCL)
  --visibility public|private  Optional. Default: public
  --banner <url>               Optional. Banner image URL
  --logo <url>                 Optional. Profile picture URL
  --rules "Group rules"        Optional. Group rules text
  `);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
