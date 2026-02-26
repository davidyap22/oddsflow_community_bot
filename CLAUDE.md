# OddsFlow Community Bot — AI Handbook

You are an AI agent that posts content to OddsFlow community groups. This file tells you everything you need to operate the bot.

## Quick Start

```bash
cd /Users/davidyap/Documents/oddsflow_community_bot

# List all available groups
npx tsx post-to-group.ts --list-rooms

# Post to a group
npx tsx post-to-group.ts \
  --key <API_KEY> \
  --room <ROOM_SLUG_OR_ID> \
  --title "Your Title" \
  --content "Your content here"
```

## Prerequisites

1. **Node.js** installed
2. **`.env.local`** in this directory with Supabase credentials (already set up):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```
3. **API Key** — the user will provide this. It starts with `oddsflow_sk_`. Generated from the OddsFlow dashboard at `/dashboard/api-keys`.

## Command Reference

### List Groups

```bash
npx tsx post-to-group.ts --list-rooms
```

Returns a table of active groups with their slugs and member counts. Use the slug as `--room` value.

### Create a Post

```bash
npx tsx post-to-group.ts \
  --key <API_KEY> \
  --room <ROOM_SLUG_OR_ID> \
  --title "Title" \
  --content "Content"
```

### All Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--key` | **Yes** | Bot API key (`oddsflow_sk_...`). User provides this. |
| `--room` | **Yes** | Group slug (e.g. `epl-fans`) or UUID. Run `--list-rooms` to see available groups. |
| `--title` | **Yes** | Post title. Wrap in quotes. |
| `--content` | **Yes** | Post body. Wrap in quotes. Supports plain text. |
| `--name` | No | Author display name override. If omitted, automatically uses the API key owner's real name and avatar from their account. Only use this to override with a custom name like `"OddsFlow AI"`. |
| `--type` | No | Content type. Default: `discussion`. Options: `discussion`, `analysis`, `news`, `prediction` |
| `--tags` | No | Comma-separated tags. Example: `"ai,epl,matchday"` |
| `--images` | No | Space-separated image paths or URLs. Local files are uploaded to Supabase Storage. Example: `--images photo.jpg https://example.com/img.png` |
| `--pin` | No | Flag (no value). Pins the post to the top of the group. |

## Examples

### Simple text post
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room epl-fans \
  --title "Matchday 28 Preview" \
  --content "Arsenal vs Chelsea kicks off at 17:30. Key stats: Arsenal unbeaten in 8 home games."
```

### Post with images
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room epl-fans \
  --title "Goal Highlight" \
  --content "Saka scores from outside the box!" \
  --images goal.jpg https://example.com/celebration.png
```

### Pinned announcement with tags
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room epl-fans \
  --title "Welcome to EPL Fans!" \
  --content "This group is for Premier League discussion. Be respectful." \
  --name "OddsFlow" \
  --tags "announcement,rules" \
  --pin
```

### Post with custom author and type
```bash
npx tsx post-to-group.ts \
  --key oddsflow_sk_abc123... \
  --room la-liga-fans \
  --title "El Clasico Analysis" \
  --content "Expected lineup changes and tactical breakdown..." \
  --name "Match Analyst" \
  --type analysis \
  --tags "el-clasico,analysis"
```

## Important Notes

- **API Key**: Never hardcode or commit the API key. The user provides it per command.
- **Content**: The `--content` value is plain text. Wrap long content in quotes.
- **Images**: Local files (jpg/png/gif/webp) are auto-uploaded to Supabase Storage. External URLs are used directly.
- **Room ID**: You can use either the human-readable slug (`epl-fans`) or the UUID. Prefer slugs for readability.
- **Errors**: If you see `Invalid API key`, ask the user to provide a valid key or generate one from `/dashboard/api-keys`.
- **Author**: If `--name` is omitted, the post automatically uses the API key owner's real name and profile picture from their account. The `--name` flag is only needed to override with a custom display name.

## How It Works (Technical)

1. Script reads Supabase credentials from `.env.local`
2. Calls the `create_bot_post` PostgreSQL RPC function via Supabase
3. The RPC function is `SECURITY DEFINER` — it validates the API key against `bot_api_keys` table, then inserts into `community_room_posts` bypassing RLS
4. Images are uploaded to Supabase Storage bucket `community-posts` before posting
