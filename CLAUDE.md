# OddsFlow Community Bot — AI Handbook

You are an AI agent that posts content to OddsFlow community groups. This file tells you everything you need to operate the bot.

## Quick Start

```bash
cd /Users/davidyap/Documents/oddsflow_community_bot

# List all available groups (get room UUIDs)
npx tsx post-to-group.ts --list-rooms

# Post to a group (author = API key owner automatically)
npx tsx post-to-group.ts \
  --key <API_KEY> \
  --room <ROOM_UUID> \
  --title "Your Title" \
  --content "Your content here"
```

## Prerequisites

1. **Node.js** installed
2. **`.env.local`** in this directory with Supabase credentials (already set up)
3. **API Key** — the user will provide this. Starts with `oddsflow_sk_`. Generated from `/dashboard/api-keys`.

## CRITICAL: Room ID Must Be UUID

The `--room` argument requires a **UUID**, not a slug. Always run `--list-rooms` first to get UUIDs, or use the known UUIDs below.

### Known Group UUIDs

| Group | UUID |
|-------|------|
| Arsenal Fan Page | `dde4ede2-1099-44a0-a625-4ab95e8e804e` |

Run `--list-rooms` to discover all groups and their UUIDs.

## Command Reference

### List Groups

```bash
npx tsx post-to-group.ts --list-rooms
```

Returns all active groups with slugs and member counts. Note: you need the UUID (from the `id` column), not the slug.

### Create a Post

```bash
npx tsx post-to-group.ts \
  --key <API_KEY> \
  --room <ROOM_UUID> \
  --title "Title" \
  --content "Content"
```

The post will automatically use the API key owner's **real name** and **profile picture**.

### All Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--key` | **Yes** | — | Bot API key (`oddsflow_sk_...`). User provides this. |
| `--room` | **Yes** | — | Group UUID. Run `--list-rooms` to find it. |
| `--title` | **Yes** | — | Post title. Wrap in quotes. |
| `--content` | **Yes** | — | Post body. Wrap in quotes. Supports plain text. |
| `--name` | No | API key owner's name | Override display name. Only use for custom names like `"OddsFlow AI"`. |
| `--type` | No | `discussion` | Content type: `discussion`, `analysis`, `news`, `prediction` |
| `--tags` | No | none | Comma-separated. Example: `"ai,epl,matchday"` |
| `--images` | No | none | Space-separated paths or URLs. Local files auto-upload. |
| `--pin` | No | false | Flag (no value). Pins post to top. |

## Examples

### Basic post (auto author)
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room dde4ede2-1099-44a0-a625-4ab95e8e804e \
  --title "Matchday 28 Preview" \
  --content "Arsenal vs Chelsea kicks off at 17:30. Arsenal unbeaten in 8 home games."
```

### Post with images
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room dde4ede2-1099-44a0-a625-4ab95e8e804e \
  --title "Goal Highlight" \
  --content "Saka scores from outside the box!" \
  --images goal.jpg https://example.com/celebration.png
```

### Pinned announcement with custom name
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room dde4ede2-1099-44a0-a625-4ab95e8e804e \
  --title "Welcome to Arsenal Fans!" \
  --content "This group is for Arsenal discussion. Be respectful." \
  --name "OddsFlow Admin" \
  --tags "announcement,rules" \
  --pin
```

### Analysis post with type tag
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room dde4ede2-1099-44a0-a625-4ab95e8e804e \
  --title "Arsenal vs Chelsea Tactical Breakdown" \
  --content "Arteta likely to deploy a 4-3-3 with Saka and Martinelli on the wings..." \
  --type analysis \
  --tags "arsenal,chelsea,tactics"
```

## Important Notes

- **Author**: Posts automatically use the API key owner's real name and profile picture. No `--name` needed.
- **Room UUID**: Must use UUID, not slug. Run `--list-rooms` to get UUIDs.
- **API Key**: Never hardcode. The user provides it per command.
- **Content**: Plain text, wrap in quotes. For long content, use single quotes to preserve newlines.
- **Images**: Local files (jpg/png/gif/webp) auto-upload to Supabase Storage. URLs are used directly.
- **Errors**: `Invalid API key` → ask user to provide valid key or generate from `/dashboard/api-keys`.

## How It Works (Technical)

1. Script reads Supabase credentials from `.env.local`
2. Calls `create_bot_post` PostgreSQL RPC function (SECURITY DEFINER)
3. RPC validates API key → looks up owner's user_id from `bot_api_keys`
4. Auto-fetches owner's name from `auth.users` and avatar from `user_profiles`
5. Inserts into `community_room_posts` (bypasses RLS)
6. Images are uploaded to Supabase Storage bucket `community-posts` before posting
