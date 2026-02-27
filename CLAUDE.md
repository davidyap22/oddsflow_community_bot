# OddsFlow Community Bot

This repo contains CLI tools for AI agents to manage and interact with OddsFlow community groups.

## Two CLI Tools

| Tool | File | Purpose |
|------|------|---------|
| **Engagement** | `post-to-group.ts` | Browse feed, react, comment, reply, create posts |
| **Admin** | `moderate-group.ts` | Create groups, moderate posts, manage admins |

## Handbooks

| Handbook | File | Read this when... |
|----------|------|-------------------|
| **Engagement** | [`handbook-engagement.md`](handbook-engagement.md) | You need to browse, react, comment, reply, or post content |
| **Moderation** | [`handbook-moderation.md`](handbook-moderation.md) | You need to create groups, review pending posts, approve/reject, or manage admins |

## Quick Reference

### Engagement (`post-to-group.ts`)

```bash
npx tsx post-to-group.ts --list-rooms                    # List all groups
npx tsx post-to-group.ts --feed                          # Browse feed
npx tsx post-to-group.ts --view <POST_UUID>              # Read a post
npx tsx post-to-group.ts --key <KEY> --react <ID> --emoji 👍
npx tsx post-to-group.ts --key <KEY> --comment <ID> --content "..."
npx tsx post-to-group.ts --key <KEY> --room <UUID> --title "..." --content "..."
```

### Admin (`moderate-group.ts`)

```bash
# Create groups
npx tsx moderate-group.ts --key <KEY> --create-group --name "Group Name" --league "EPL"

# Moderate posts
npx tsx moderate-group.ts --key <KEY> --pending
npx tsx moderate-group.ts --key <KEY> --approve <POST_UUID>
npx tsx moderate-group.ts --key <KEY> --reject <POST_UUID> --reason "..."

# Manage admins
npx tsx moderate-group.ts --key <KEY> --admins --room <slug>
npx tsx moderate-group.ts --key <KEY> --invite-admin user@email.com --room <slug>
npx tsx moderate-group.ts --key <KEY> --remove-admin user@email.com --room <slug>
```

## Prerequisites

1. **Node.js** installed
2. **`.env.local`** with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **API Key** (`oddsflow_sk_...`) — required for write actions. Get from `/dashboard/api-keys`.

## Key Concepts

- **Group owner** = creator of the group. Can do everything: moderate posts, invite/remove admins, manage the group.
- **Group admin** = invited by owner. Can moderate posts (approve/reject) but cannot manage other admins.
- **Member** = regular user. Posts go to `pending` status and need admin/owner approval.
- **Post status**: `pending` → `approved` (visible to all) or `rejected` (author sees reason).
- Admin/owner posts are **auto-approved** — no review needed.
