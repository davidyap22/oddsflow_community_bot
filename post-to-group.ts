/**
 * Community bot CLI — post, react, comment, reply, feed, view (using anon key + RPC)
 *
 * Usage:
 *   npx tsx post-to-group.ts --list-rooms
 *   npx tsx post-to-group.ts --feed [--room <room_uuid>] [--limit 10]
 *   npx tsx post-to-group.ts --view <post_uuid>
 *   npx tsx post-to-group.ts --key <api_key> --room <room_id> --title "Title" --content "Content"
 *   npx tsx post-to-group.ts --key <api_key> --room <room_id> --title "Title" --content "Content" --images img1.jpg img2.png
 *   npx tsx post-to-group.ts --key <api_key> --room <room_id> --title "Title" --content "Content" --name "OddsFlow AI" --pin
 *   npx tsx post-to-group.ts --key <api_key> --react <post_uuid> --emoji 👍
 *   npx tsx post-to-group.ts --key <api_key> --react-comment <comment_uuid> --emoji 👍
 *   npx tsx post-to-group.ts --key <api_key> --comment <post_uuid> --content "Great analysis!"
 *   npx tsx post-to-group.ts --key <api_key> --reply <comment_uuid> --post <post_uuid> --content "Thanks!"
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

async function reactToPost() {
  const apiKey = getArg('key');
  const postId = getArg('react');
  const emoji = getArg('emoji');

  if (!apiKey || !postId || !emoji) {
    console.error('Usage: npx tsx post-to-group.ts --key <api_key> --react <post_uuid> --emoji 👍');
    process.exit(1);
  }

  const { data, error } = await supabase.rpc('create_bot_reaction', {
    p_api_key: apiKey,
    p_post_id: postId,
    p_emoji: emoji,
  });

  if (error) {
    console.error('Reaction failed:', error.message);
    process.exit(1);
  }

  console.log(`\nReaction ${data.action}: ${data.emoji} on post ${data.post_id}`);
}

async function commentOnPost() {
  const apiKey = getArg('key');
  const postId = getArg('comment');
  const content = getArg('content');

  if (!apiKey || !postId || !content) {
    console.error('Usage: npx tsx post-to-group.ts --key <api_key> --comment <post_uuid> --content "Your comment"');
    process.exit(1);
  }

  const { data, error } = await supabase.rpc('create_bot_comment', {
    p_api_key: apiKey,
    p_post_id: postId,
    p_content: content,
  });

  if (error) {
    console.error('Comment failed:', error.message);
    process.exit(1);
  }

  console.log(`\nComment added to post ${postId}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Author: ${data.author_name}`);
}

async function replyToComment() {
  const apiKey = getArg('key');
  const parentId = getArg('reply');
  const postId = getArg('post');
  const content = getArg('content');

  if (!apiKey || !parentId || !postId || !content) {
    console.error('Usage: npx tsx post-to-group.ts --key <api_key> --reply <comment_uuid> --post <post_uuid> --content "Your reply"');
    process.exit(1);
  }

  const { data, error } = await supabase.rpc('create_bot_comment', {
    p_api_key: apiKey,
    p_post_id: postId,
    p_content: content,
    p_parent_id: parentId,
  });

  if (error) {
    console.error('Reply failed:', error.message);
    process.exit(1);
  }

  console.log(`\nReply added to comment ${parentId}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Author: ${data.author_name}`);
  console.log(`   Parent: ${data.parent_id}`);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function smartFeed() {
  const roomId = getArg('room');
  const limitStr = getArg('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : 10;

  // Fetch posts from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('community_room_posts')
    .select('id, title, content, author_name, comments_count, likes_count, created_at, room_id, is_pinned')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false });

  if (roomId) {
    // Resolve UUID to slug since room_id stores slug
    const { data: group } = await supabase
      .from('community_groups')
      .select('slug')
      .eq('id', roomId)
      .single();
    if (group) {
      query = query.eq('room_id', group.slug);
    } else {
      // Try using roomId directly as slug
      query = query.eq('room_id', roomId);
    }
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error('Feed error:', error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('\nNo posts in the last 7 days.');
    return;
  }

  // Score each post
  const scored = posts.map(p => {
    const ageMs = Date.now() - new Date(p.created_at).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    let score = 0;
    // Recency
    if (ageHours < 24) score += 100;
    else if (ageHours < 48) score += 50;
    else score += 20;
    // Engagement
    score += (p.comments_count || 0) * 3 + (p.likes_count || 0);
    // Pinned
    if (p.is_pinned) score += 200;

    // Tag
    let tag = '';
    if (p.is_pinned) tag = 'PIN';
    else if (ageHours < 24) tag = 'NEW';
    else if ((p.comments_count || 0) >= 5 || (p.likes_count || 0) >= 5) tag = 'HOT';

    return { ...p, score, tag };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  const feed = scored.slice(0, limit);

  console.log(`\nFeed (${feed.length} posts):\n`);
  feed.forEach((p, i) => {
    const tagStr = p.tag ? `[${p.tag}] ` : '';
    const preview = (p.content || '').slice(0, 80).replace(/\n/g, ' ');
    console.log(`${(i + 1).toString().padStart(2)}. ${tagStr}"${p.title}" by ${p.author_name} (${timeAgo(p.created_at)}) — ${p.room_id}`);
    console.log(`    👍${p.likes_count || 0}  💬${p.comments_count || 0}    ID: ${p.id}`);
    if (preview) console.log(`    Preview: ${preview}${(p.content || '').length > 80 ? '...' : ''}`);
    console.log('');
  });
}

async function viewPost() {
  const postId = getArg('view');

  if (!postId) {
    console.error('Usage: npx tsx post-to-group.ts --view <post_uuid>');
    process.exit(1);
  }

  // Fetch post
  const { data: post, error: postErr } = await supabase
    .from('community_room_posts')
    .select('id, title, content, author_name, comments_count, likes_count, created_at, room_id, is_pinned, content_type, tags, metadata')
    .eq('id', postId)
    .single();

  if (postErr || !post) {
    console.error('Post not found:', postErr?.message || 'No data');
    process.exit(1);
  }

  // Fetch reactions for this post
  const { data: reactions } = await supabase
    .from('community_post_reactions')
    .select('emoji')
    .eq('post_id', postId);

  // Group reactions by emoji
  const emojiCounts: Record<string, number> = {};
  if (reactions) {
    for (const r of reactions) {
      emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
    }
  }
  const reactionsStr = Object.entries(emojiCounts).map(([e, c]) => `${e}${c}`).join(' ') || 'none';

  // Print post
  console.log(`\nPOST: "${post.title}"`);
  console.log(`Author: ${post.author_name}`);
  console.log(`Date: ${new Date(post.created_at).toLocaleString()} (${timeAgo(post.created_at)})`);
  console.log(`Group: ${post.room_id}`);
  if (post.is_pinned) console.log(`Pinned: yes`);
  console.log(`Reactions: ${reactionsStr}`);
  console.log(`\nContent:`);
  console.log(post.content);

  // Fetch comments
  const { data: comments } = await supabase
    .from('community_post_comments')
    .select('id, author_name, content, created_at, parent_id, likes_count')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (!comments || comments.length === 0) {
    console.log(`\nComments (0): none`);
    return;
  }

  // Fetch comment reactions
  const commentIds = comments.map(c => c.id);
  const { data: commentReactions } = await supabase
    .from('community_comment_reactions')
    .select('comment_id, emoji')
    .in('comment_id', commentIds);

  // Group comment reactions
  const commentEmojiMap: Record<string, Record<string, number>> = {};
  if (commentReactions) {
    for (const r of commentReactions) {
      if (!commentEmojiMap[r.comment_id]) commentEmojiMap[r.comment_id] = {};
      commentEmojiMap[r.comment_id][r.emoji] = (commentEmojiMap[r.comment_id][r.emoji] || 0) + 1;
    }
  }

  // Separate top-level and replies
  const topLevel = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);
  const replyMap: Record<string, typeof comments> = {};
  for (const r of replies) {
    if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
    replyMap[r.parent_id].push(r);
  }

  console.log(`\nComments (${comments.length}):`);
  for (const c of topLevel) {
    const cReactions = commentEmojiMap[c.id];
    const cReactStr = cReactions ? ' ' + Object.entries(cReactions).map(([e, n]) => `${e}${n}`).join(' ') : '';
    console.log(`  [${c.id}] ${c.author_name} (${timeAgo(c.created_at)}): ${c.content}${cReactStr}`);

    // Print replies
    const childReplies = replyMap[c.id] || [];
    for (const r of childReplies) {
      const rReactions = commentEmojiMap[r.id];
      const rReactStr = rReactions ? ' ' + Object.entries(rReactions).map(([e, n]) => `${e}${n}`).join(' ') : '';
      console.log(`    [${r.id}] ${r.author_name} (${timeAgo(r.created_at)}): ${r.content}${rReactStr}`);
    }
  }
}

async function reactToComment() {
  const apiKey = getArg('key');
  const commentId = getArg('react-comment');
  const emoji = getArg('emoji');

  if (!apiKey || !commentId || !emoji) {
    console.error('Usage: npx tsx post-to-group.ts --key <api_key> --react-comment <comment_uuid> --emoji 👍');
    process.exit(1);
  }

  const { data, error } = await supabase.rpc('create_bot_comment_reaction', {
    p_api_key: apiKey,
    p_comment_id: commentId,
    p_emoji: emoji,
  });

  if (error) {
    console.error('Comment reaction failed:', error.message);
    process.exit(1);
  }

  console.log(`\nReaction ${data.action}: ${data.emoji} on comment ${data.comment_id}`);
}

async function createPost() {
  const apiKey = getArg('key');
  const roomId = getArg('room');
  const title = getArg('title');
  const content = getArg('content');
  const authorName = getArg('name'); // null = auto-fetch from Gmail profile
  const contentType = getArg('type') || 'discussion';
  const tagsRaw = getArg('tags');
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];
  const imagePaths = getArgList('images');

  if (!apiKey || !roomId || !title || !content) {
    console.error('Usage: npx tsx post-to-group.ts --key <api_key> --room <id> --title "..." --content "..."');
    console.error('Optional: --images img1.jpg img2.png --name "Bot" --tags "ai,news" --pin');
    process.exit(1);
  }

  // Upload images and collect URLs
  const metadata: Record<string, unknown> = {};
  if (imagePaths.length > 0) {
    console.log(`\nUploading ${imagePaths.length} image(s)...`);
    const imageUrls: string[] = [];
    for (const imgPath of imagePaths) {
      // External URL - use directly
      if (imgPath.startsWith('http')) {
        imageUrls.push(imgPath);
        console.log(`   URL: ${imgPath}`);
        continue;
      }
      // Local file - upload to Storage
      const absPath = path.resolve(imgPath);
      if (!fs.existsSync(absPath)) {
        console.error(`   Warning: Not found: ${absPath}, skipping`);
        continue;
      }
      const fileBuffer = fs.readFileSync(absPath);
      const ext = path.extname(absPath).slice(1).toLowerCase() || 'jpg';
      const storagePath = `posts/${roomId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const contentTypeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      };
      const { error: uploadErr } = await supabase.storage
        .from('community-posts')
        .upload(storagePath, fileBuffer, {
          contentType: contentTypeMap[ext] || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadErr) {
        console.error(`   Warning: Upload failed for ${imgPath}: ${uploadErr.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('community-posts').getPublicUrl(storagePath);
      if (urlData?.publicUrl) {
        imageUrls.push(urlData.publicUrl);
        console.log(`   Uploaded: ${path.basename(absPath)} -> ${urlData.publicUrl}`);
      }
    }
    if (imageUrls.length > 0) {
      metadata.images = imageUrls;
    }
  }

  // Call RPC function (bypasses RLS via SECURITY DEFINER)
  const rpcParams: Record<string, unknown> = {
    p_api_key: apiKey,
    p_room_id: roomId,
    p_title: title,
    p_content: content,
    p_content_type: contentType,
    p_tags: tags,
    p_is_pinned: pin,
    p_metadata: metadata,
  };
  if (authorName) rpcParams.p_author_name = authorName;

  const { data, error } = await supabase.rpc('create_bot_post', rpcParams);

  if (error) {
    console.error('Post failed:', error.message);
    process.exit(1);
  }

  console.log(`\nPosted to group ${roomId}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   Title: ${title}`);
  console.log(`   Author: ${data.author_name || authorName}`);
  if (pin) console.log(`   Pinned`);
}

async function main() {
  if (listRooms) {
    await listAllRooms();
  } else if (args.includes('--feed')) {
    await smartFeed();
  } else if (getArg('view')) {
    await viewPost();
  } else if (getArg('react-comment')) {
    await reactToComment();
  } else if (getArg('react')) {
    await reactToPost();
  } else if (getArg('comment')) {
    await commentOnPost();
  } else if (getArg('reply')) {
    await replyToComment();
  } else {
    await createPost();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
