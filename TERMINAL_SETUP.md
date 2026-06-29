# R2BOT — Terminal Setup for Claude Code

## Step 1: Update Permissions File

Open your terminal and run this to give Claude Code full access to the project:

```bash
cat > ~/Desktop/robot/.claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Glob(*)",
      "Grep(*)",
      "WebFetch(*)",
      "WebSearch(*)",
      "mcp__*"
    ]
  }
}
EOF
```

---

## Step 2: The Terminal Command to Start Claude Code

Navigate to the project folder and run:

```bash
cd ~/Desktop/robot && claude --dangerously-skip-permissions
```

The `--dangerously-skip-permissions` flag means Claude never stops to ask
"can I do this?" — it just does it. This is correct for a development workflow
where you trust the project context (which is now fully defined in CLAUDE.md).

---

## Step 3: First Prompt to Run (copy-paste this exactly)

When Claude Code starts, paste this as your first message:

```
Read CLAUDE.md completely. This is our master strategy document — understand 
the full product vision, feature set, tech stack, and priorities before doing 
anything.

Then do the following in sequence:

1. Search the entire codebase for any occurrence of "free forever" (case-insensitive) 
   and replace with freemium-aligned language. Report every file changed.

2. Fix the SSR/CSR problem: audit every page in /app that has a loading spinner 
   as its primary render. List them all and tell me which ones can be converted to 
   SSG/ISR and which require client rendering (auth-gated pages).

3. Audit the current navigation in components/Nav.tsx and tell me what needs to 
   change to match the 5-item nav structure defined in CLAUDE.md Section 7. 
   Do not implement yet — just give me the diff plan first.

After these three audits, I'll tell you which to implement first.
```

---

## Step 4: Subsequent Session Starter

Every new Claude Code session, paste this to restore context instantly:

```
Read CLAUDE.md — this is our master document. You are building R2BOT, the 
world's best robotics learning platform. Our primary user is a college student 
who wants to become a robotics engineer. We are a full-time team. 

Current P0 priorities from CLAUDE.md Section 13:
1. SSR/SSG fix on all public pages
2. Remove all "free forever" language  
3. Navigation restructure (5-item nav)
4. World Robotics Map → fold into Atlas
5. Hardware Index → removed from nav

What is the status of each of these? Check the codebase and tell me what's 
done, what's in progress, and what hasn't been touched yet.
```

---

## Quick Reference Commands

```bash
# Start Claude Code (full permissions)
cd ~/Desktop/robot && claude --dangerously-skip-permissions

# Run type check before pushing
npm run type-check

# Run local dev server
npm run dev

# Build check before pushing to Vercel
npm run build

# Seed Atlas entries
npm run seed:atlas

# Push to GitHub (triggers Vercel auto-deploy)
git add -A && git commit -m "feat: [description]" && git push
```

---

## Vercel Direct Deploy (if needed)

```bash
# Install Vercel CLI if not already
npm i -g vercel

# Deploy to production
vercel --prod
```

---

## Supabase Useful Commands

```bash
# Open Supabase dashboard
open https://supabase.com/dashboard/project/acrdjpmvdscngldxilgm

# Generate TypeScript types from schema
npx supabase gen types typescript --project-id acrdjpmvdscngldxilgm > lib/supabase/types.ts
```

---

*Last updated: May 24, 2026 | Based on full R2BOT strategic audit*
