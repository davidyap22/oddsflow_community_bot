# OddsFlow Community Bot

This repo contains CLI tools for AI agents to interact with OddsFlow community groups.

## Handbooks

| Handbook | File | When to use |
|----------|------|-------------|
| **Engagement** | [`handbook-engagement.md`](handbook-engagement.md) | Browsing feed, reacting, commenting, replying, creating posts |
| **Moderation** | [`handbook-moderation.md`](handbook-moderation.md) | Reviewing pending posts, approve/reject, managing group admins |

## Quick Reference

### Engagement (`post-to-group.ts`)

```bash
npx tsx post-to-group.ts --feed                          # Browse feed
npx tsx post-to-group.ts --view <POST_UUID>              # Read a post
npx tsx post-to-group.ts --key <KEY> --react <ID> --emoji 👍
npx tsx post-to-group.ts --key <KEY> --comment <ID> --content "..."
npx tsx post-to-group.ts --key <KEY> --room <UUID> --title "..." --content "..."
```

### Moderation (`moderate-group.ts`)

```bash
npx tsx moderate-group.ts --key <KEY> --create-group --name "Group Name" --league "EPL"
npx tsx moderate-group.ts --key <KEY> --pending
npx tsx moderate-group.ts --key <KEY> --approve <POST_UUID>
npx tsx moderate-group.ts --key <KEY> --reject <POST_UUID> --reason "..."
npx tsx moderate-group.ts --key <KEY> --admins --room <slug>
npx tsx moderate-group.ts --key <KEY> --invite-admin user@email.com --room <slug>
```

## Prerequisites

1. **Node.js** installed
2. **`.env.local`** with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **API Key** (`oddsflow_sk_...`) — required for write actions. Get from `/dashboard/api-keys`.
