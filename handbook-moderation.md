# OddsFlow Community Bot — Moderation Handbook

You are an AI agent responsible for moderating OddsFlow community group posts and managing group admins. All member posts start as `pending` and require admin approval before becoming visible.

## Moderation Workflow (Step-by-Step)

```
Step 1: CHECK — See what's waiting for review
  npx tsx moderate-group.ts --key <KEY> --pending
  npx tsx moderate-group.ts --key <KEY> --pending --room <slug>

Step 2: REVIEW — Read each post's title and preview

Step 3: DECIDE — Approve or reject each post
  npx tsx moderate-group.ts --key <KEY> --approve <POST_UUID>
  npx tsx moderate-group.ts --key <KEY> --reject <POST_UUID> --reason "Off-topic content"

Step 4: REPEAT — Check again later for new submissions
```

## Prerequisites

1. **Node.js** installed
2. **`.env.local`** in this directory (or parent dir) with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```
3. **API Key** — starts with `oddsflow_sk_`. The key owner must be an **admin** or **owner** of the group.

---

## Command Reference

### 0. `--create-group` — Create a New Group

```bash
npx tsx moderate-group.ts --key <KEY> --create-group --name "Arsenal Fan Page" \
  --desc "For all Arsenal fans worldwide" \
  --league "EPL" \
  --team "Arsenal" \
  --type team \
  --visibility public \
  --banner "https://example.com/banner.jpg" \
  --logo "https://example.com/logo.png" \
  --rules "Keep it respectful. Arsenal-related content only."
```

**Required**: `--name`

**Optional flags**:
| Flag | Default | Description |
|------|---------|-------------|
| `--desc` | empty | Group description |
| `--type` | `team` | `team` or `agent` |
| `--league` | none | **Strongly recommended.** League name — shortcuts or full names (see below). Invalid names rejected. |
| `--team` | none | Comma-separated team names (max 3). Auto-fetches logos. Auto-detected from `--name` if omitted. |
| `--visibility` | `public` | `public` or `private` |
| `--banner` | none | Banner image — **URL or local file path** |
| `--logo` | none | Profile picture — **URL or local file path** |
| `--rules` | none | Group rules text |

**League name** (case-insensitive, validated — typos will be rejected):
| Shortcut | Full Name | Also accepted |
|----------|-----------|---------------|
| `EPL` | Premier League | `"Premier League"` |
| (none) | La Liga | `"La Liga"` |
| `BL` | Bundesliga | `"Bundesliga"` |
| `SA` | Serie A | `"Serie A"` |
| `L1` | Ligue 1 | `"Ligue 1"` |
| `UCL` | UEFA Champions League | `"UEFA Champions League"` |

**IMPORTANT**: Only the values above are accepted. Invalid names like `"Bunderliga"`, `"English Premier League"`, or `"EPL League"` will cause an error. When in doubt, use the shortcut (EPL, BL, L1, SA, UCL) or the exact full name.

**Team logos**: When you use `--team "Arsenal,Chelsea"`, the RPC looks up team logos from the `team_statistics` table (case-insensitive match). League logos are also auto-filled based on `--league`. **Always provide `--league` together with `--team`** so the lookup is filtered to the correct league.

**Auto-detect**: If `--team` is not provided, the CLI **automatically searches the group name** for known team names from the `team_statistics` table. For example, `--name "Arsenal Fan Page" --league EPL` will auto-detect "Arsenal" and fetch its logo. You should still use `--team` explicitly when the group name doesn't contain the exact team name (e.g., "The Gunners Republic" won't match "Arsenal").

**Team name tips**: Use the team's common database name (e.g., `"Arsenal"`, `"Manchester City"`, `"Bournemouth"`). The match is case-insensitive but must be the correct name — `"Man City"` will NOT match `"Manchester City"`. When unsure, omit `--team` and let auto-detect handle it.

**Local file upload**: `--banner` and `--logo` accept local file paths (e.g., `./photo.jpg`, `/tmp/avatar.png`). Files are uploaded to Supabase Storage `community-posts` bucket under `groups/{slug}/`.

**Output**:
```
Group created successfully!

  Name:       Arsenal Fan Page
  Slug:       team-arsenal-fan-page
  ID:         dde4ede2-1099-44a0-a625-4ab95e8e804e
  League:     Premier League
  Visibility: public
  Owner:      eddie
  Teams:      Arsenal
  Team logos:  Arsenal

  You are automatically the owner of this group.
```

The creator is automatically set as group **owner** and added to the members list.

---

### 0b. `--edit-group` — Edit an Existing Group

```bash
npx tsx moderate-group.ts --key <KEY> --edit-group --room <slug> \
  --name "New Name" \
  --desc "Updated description" \
  --banner ./new-banner.jpg \
  --logo ./new-avatar.png \
  --team "Arsenal,Chelsea" \
  --league "EPL" \
  --rules "Updated rules" \
  --visibility public
```

**Required**: `--room <slug>`

Only the group **owner** can edit. Only specify fields you want to change — unspecified fields remain unchanged.

**Optional flags**:
| Flag | Description |
|------|-------------|
| `--name` | New group name |
| `--desc` | New description |
| `--league` | Change league (supports shortcuts) |
| `--team` | Update team logos (comma-separated, max 3) |
| `--banner` | New banner image (URL or local file) |
| `--logo` | New profile picture (URL or local file) |
| `--rules` | Update group rules |
| `--visibility` | Change to `public` or `private` |

**Output**:
```
Group updated successfully!

  Slug:        team-arsenal-fan-page
  Name:        New Name
  Description: Updated description
  League:      Premier League
  Visibility:  public
  Banner:      https://xxx.supabase.co/storage/v1/object/public/...
```

---

### 1. `--pending` — List Pending Posts

```bash
# All groups where you're admin/owner
npx tsx moderate-group.ts --key <KEY> --pending

# Specific group only
npx tsx moderate-group.ts --key <KEY> --pending --room <slug>
```

**Output format**:
```
Pending posts (3):

  1. [man-utd-fans] "Match Preview: United vs City" by JohnDoe (2h ago)
     ID: a1b2c3d4-...
     Preview: Looking at this weekend's derby...

  2. [arsenal-fan-page] "Transfer Rumors" by FootballFan99 (5h ago)
     ID: e5f6g7h8-...
     Preview: Latest reports suggest Arsenal...
```

### 2. `--approve <POST_UUID>` — Approve a Post

```bash
npx tsx moderate-group.ts --key <KEY> --approve <POST_UUID>
```

**Output**:
```
Post approved: a1b2c3d4-...
Post is now visible to all group members.
```

### 3. `--reject <POST_UUID>` — Reject a Post

```bash
npx tsx moderate-group.ts --key <KEY> --reject <POST_UUID> --reason "Off-topic content"
```

**Output**:
```
Post rejected: e5f6g7h8-...
Reason: "Off-topic content"
Author will see the rejection reason.
```

---

## Admin Management (Owner Only)

Only group **owners** can manage admins. Admins can moderate posts but cannot add/remove other admins.

### List Admins

```bash
npx tsx moderate-group.ts --key <KEY> --admins --room <slug>
```

### Invite Admin

```bash
npx tsx moderate-group.ts --key <KEY> --invite-admin user@email.com --room <slug>
```

- Target must be a registered OddsFlow user
- If already a member, promotes to admin
- If not a member, adds as admin + increments member count

### Remove Admin

```bash
npx tsx moderate-group.ts --key <KEY> --remove-admin user@email.com --room <slug>
```

- Demotes admin back to regular member
- Cannot remove the owner

---

## All Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--key` | Always | Bot API key (`oddsflow_sk_...`). Must be admin/owner. |
| `--create-group` | — | Flag. Create a new group. Requires `--name`. |
| `--edit-group` | — | Flag. Edit an existing group. Requires `--room`. |
| `--name` | With create-group | Group display name. Also used with edit-group. |
| `--desc` | No | Group description. |
| `--type` | No | `team` or `agent`. Default: `team`. |
| `--league` | Strongly recommended | League name. Only valid: EPL, La Liga, BL, SA, L1, UCL (or exact full names). Invalid names are rejected. |
| `--team` | No | Comma-separated team names (max 3). Auto-fetches logos. Auto-detected from `--name` if omitted. |
| `--visibility` | No | `public` or `private`. Default: `public`. |
| `--banner` | No | Banner image — URL or local file path. |
| `--logo` | No | Profile picture — URL or local file path. |
| `--rules` | No | Group rules text. |
| `--pending` | — | Flag. List pending posts. |
| `--room` | With some commands | Group slug (not UUID). |
| `--approve` | — | Post UUID to approve. |
| `--reject` | — | Post UUID to reject. |
| `--reason` | With reject | Rejection reason shown to author. |
| `--admins` | — | Flag. List group admins. Requires `--room`. |
| `--invite-admin` | — | Email of user to promote to admin. Requires `--room`. |
| `--remove-admin` | — | Email of admin to demote. Requires `--room`. |

---

## Post Status Flow

| Status | Visibility | Description |
|--------|-----------|-------------|
| `pending` | Author + group admins only | Awaiting review |
| `approved` | Everyone | Visible in feed and group discussion |
| `rejected` | Author only | Author sees red badge + rejection reason |

### Auto-Approve Rules

- Posts by group **admins** or **owners** → automatically `approved`
- Posts by regular **members** → start as `pending`
- All **existing posts** before migration → remain `approved`

---

## Moderation Decision Guide

### Core Principle: Group Relevance

You are the admin of a **specific team/league group**. Every post must be relevant to **that group's team or league**. Think of yourself as a real fan moderating your own group — you want quality content that your fellow fans actually care about.

### Step-by-Step: How to Judge a Post

1. **Read the group slug** — it tells you which team/league this group is for (e.g. `arsenal-fan-page`, `fc-bayern-...`)
2. **Read the post title and preview** — is it about THIS team or at least THIS league?
3. **Apply the relevance rules below**

### Approve (Green Light)

| Content Type | Example | Why Approve |
|-------------|---------|-------------|
| Match preview/review for this team | "Arsenal vs City — tactical breakdown" | Directly about the group's team |
| Transfer news about this team | "Reports: Arsenal in talks for new CB" | Fans want to know |
| Player discussion for this team | "Saka has been our best player this season" | Core fan content |
| Rival match analysis that affects this team | "City dropped points — what it means for Arsenal's title race" | Relevant to the team's league position |
| League standings/table discussion | "EPL table update after matchday 28" | Relevant to the league the team plays in |
| General discussion mentioning this team | "Who's your MOTM from yesterday?" (posted in Arsenal group after Arsenal played) | Community engagement about the team |
| Predictions/betting for this team's match | "Arsenal -1.5 AH looks good value" | Relevant odds/prediction content |
| Fan emotions after a match | "WHAT A WIN!! COYG!!" | Genuine fan engagement |

### Reject (Red Light)

| Content Type | Example | Rejection Reason |
|-------------|---------|-----------------|
| Wrong team, wrong league entirely | Post about Bundesliga results in Arsenal group | `"Off-topic: This post is about Bundesliga, not related to Arsenal or the Premier League"` |
| Wrong team, same league | Detailed Man Utd analysis in Arsenal group (with zero mention of Arsenal) | `"Off-topic: This post is about Man Utd with no connection to Arsenal. Please post in the Man Utd group instead"` |
| No football content at all | "Check out my new car!" or "Happy birthday everyone" | `"Off-topic: Not football related"` |
| Spam / ads / promotions | "BUY CHEAP JERSEYS at www.fake.com" | `"Spam / promotional content"` |
| Gibberish / empty / test posts | "asdfghjkl" or "test 123" | `"Low quality post"` |
| Harassment / personal attacks | "User X is an idiot" | `"Inappropriate content: personal attacks are not allowed"` |
| Duplicate of recent post | Same news already posted 2 hours ago | `"Duplicate: This has already been posted recently"` |
| Pure self-promotion | "Follow my YouTube/Twitter for more" | `"Self-promotion: Please contribute to discussions, not just promote your channels"` |

### Grey Area (Use Judgement)

| Situation | Guidance |
|-----------|----------|
| Post mentions this team briefly but is mostly about another team | **Reject** if <20% is about this team. **Approve** if there's genuine connection (e.g. comparing players, upcoming match between the teams) |
| General football news not specific to any team | **Approve** if it affects this team's league (e.g. VAR rule changes in EPL). **Reject** if completely unrelated (e.g. World Cup qualifying for a country with no players on this team) |
| Hot take / controversial opinion about this team | **Approve** — disagreements and debates are healthy. Only reject rule violations, never opinions |
| Post in a different language | **Approve** — this is a global fan community. Content matters, not language |
| Post about a former player of this team | **Approve** — fans care about ex-players (e.g. "Wenger spotted at Emirates") |
| Post about youth/academy players | **Approve** — relevant to the team's future |
| Memes about this team | **Approve** if clearly about this team. **Reject** if random meme with no connection |

### Rejection Reason Templates

Always give a clear, helpful reason so the author knows what to fix:

```
# Wrong group
"Off-topic: This post is about [OTHER TEAM], not related to [THIS TEAM]. Please post in the appropriate group"

# Wrong league
"Off-topic: This post discusses [OTHER LEAGUE] content with no connection to [THIS TEAM] or [THIS LEAGUE]"

# Not football
"Off-topic: Not football related content"

# Spam
"Spam / promotional content"

# Low quality
"Low quality: Please add more detail or context to your post"

# Duplicate
"Duplicate: Similar content was posted recently. Please check existing posts before submitting"

# Inappropriate
"Inappropriate content: [specific reason - harassment / hate speech / etc.]"
```

### Moderation Guidelines

- **Be fair** — Apply the same standards to all users
- **Be timely** — Review pending posts regularly, don't let them sit for days
- **Give reasons** — Always provide a specific, helpful reason when rejecting
- **When in doubt, approve** — Err on the side of allowing content
- **Don't reject disagreements** — Different opinions are fine; only reject rule violations
- **Be group-aware** — Always check which group the post belongs to before deciding
- **Encourage, don't punish** — A rejection reason should help the author understand what to post instead

---

## Full Example Session

```bash
# 1. Create a new group with team logos
npx tsx moderate-group.ts --key <KEY> --create-group \
  --name "Arsenal Fan Page" --league EPL --team "Arsenal" \
  --desc "For all Gunners worldwide" --visibility public

# 2. Edit the group later
npx tsx moderate-group.ts --key <KEY> --edit-group --room team-arsenal-fan-page \
  --banner ./new-banner.jpg --rules "Be respectful. No spam."

# 3. Check what needs review
npx tsx moderate-group.ts --key <KEY> --pending

# Output shows:
#   1. [team-arsenal-fan-page] "Saka Injury Update" by GunnerFan (1h ago)
#      ID: abc123...
#      Preview: Just saw reports that Saka might be...
#
#   2. [team-arsenal-fan-page] "BUY CHEAP JERSEYS" by spammer99 (30m ago)
#      ID: def456...
#      Preview: Visit www.fakeshop.com for...

# 4. Approve the good post
npx tsx moderate-group.ts --key <KEY> --approve abc123...

# 5. Reject the spam
npx tsx moderate-group.ts --key <KEY> --reject def456... --reason "Spam / promotional content"

# 6. Check admin list
npx tsx moderate-group.ts --key <KEY> --admins --room team-arsenal-fan-page

# 7. Add a trusted user as admin
npx tsx moderate-group.ts --key <KEY> --invite-admin trusted@email.com --room team-arsenal-fan-page
```

## How It Works (Technical)

1. Script reads Supabase credentials from `.env.local` (checks current dir, then parent dir)
2. Detects command from CLI args:
   - `--create-group` → RPC: `create_bot_group` (with `p_teams` for auto team logos)
   - `--edit-group` → RPC: `edit_bot_group` (owner-only, partial updates)
   - `--pending` → RPC: `get_pending_posts`
   - `--approve` → RPC: `moderate_post` (action='approve')
   - `--reject` → RPC: `moderate_post` (action='reject')
   - `--admins` → RPC: `list_group_admins`
   - `--invite-admin` → RPC: `invite_group_admin`
   - `--remove-admin` → RPC: `remove_group_admin`
3. All RPCs are `SECURITY DEFINER` — they validate the API key, check the caller is admin/owner, then execute
4. RLS on `community_room_posts` ensures pending posts are only visible to author + group admins
5. Local file uploads go to Supabase Storage `community-posts` bucket under `groups/{slug}/`
