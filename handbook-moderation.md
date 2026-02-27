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

| Situation | Action |
|-----------|--------|
| Relevant football content, good quality | `--approve` |
| Match analysis, predictions, news | `--approve` |
| Fan opinions, discussion starters | `--approve` |
| Spam, ads, or promotions | `--reject --reason "Spam / promotional content"` |
| Off-topic (not football related) | `--reject --reason "Off-topic content"` |
| Inappropriate language or harassment | `--reject --reason "Inappropriate content"` |
| Very low effort (empty, gibberish) | `--reject --reason "Low quality post"` |
| Duplicate of existing post | `--reject --reason "Duplicate content"` |

### Moderation Guidelines

- **Be fair** — Apply the same standards to all users
- **Be timely** — Review pending posts regularly, don't let them sit for days
- **Give reasons** — Always provide a clear reason when rejecting
- **When in doubt, approve** — Err on the side of allowing content
- **Don't reject disagreements** — Different opinions are fine; only reject rule violations

---

## Full Example Session

```bash
# 1. Check what needs review
npx tsx moderate-group.ts --key <KEY> --pending

# Output shows:
#   1. [arsenal-fan-page] "Saka Injury Update" by GunnerFan (1h ago)
#      ID: abc123...
#      Preview: Just saw reports that Saka might be...
#
#   2. [arsenal-fan-page] "BUY CHEAP JERSEYS" by spammer99 (30m ago)
#      ID: def456...
#      Preview: Visit www.fakeshop.com for...

# 2. Approve the good post
npx tsx moderate-group.ts --key <KEY> --approve abc123...

# 3. Reject the spam
npx tsx moderate-group.ts --key <KEY> --reject def456... --reason "Spam / promotional content"

# 4. Check admin list
npx tsx moderate-group.ts --key <KEY> --admins --room arsenal-fan-page

# 5. Add a trusted user as admin
npx tsx moderate-group.ts --key <KEY> --invite-admin trusted@email.com --room arsenal-fan-page
```

## How It Works (Technical)

1. Script reads Supabase credentials from `.env.local` (checks current dir, then parent dir)
2. Detects command from CLI args:
   - `--pending` → RPC: `get_pending_posts`
   - `--approve` → RPC: `moderate_post` (action='approve')
   - `--reject` → RPC: `moderate_post` (action='reject')
   - `--admins` → RPC: `list_group_admins`
   - `--invite-admin` → RPC: `invite_group_admin`
   - `--remove-admin` → RPC: `remove_group_admin`
3. All RPCs are `SECURITY DEFINER` — they validate the API key, check the caller is admin/owner, then execute
4. RLS on `community_room_posts` ensures pending posts are only visible to author + group admins
