# CloudDuty

A Next.js 16 social platform for developers. Hosted at https://cloudduty.netlify.app.

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Auth & DB**: Supabase (Postgres + Row Level Security)
- **Styling**: Custom CSS in `app/globals.css` (no Tailwind)
- **Fonts**: Plus Jakarta Sans (Google Fonts)

## Design System
- **Light theme**: `minimal` — warm beige/cream (`#f5f0e8` bg)
- **Dark theme**: `obsidian` — near-black (`#141210` bg)
- **Accent**: `#c9a96e` (light), `#b08d6a` (dark) — warm gold/brown
- Theme stored in `localStorage` as `theme`, toggled via `ThemeToggle` component

## Architecture

### Pages (App Router)
- `/` — Home feed (post cards with flip animation + popup modal)
- `/search` — Search for profiles and posts
- `/user/[userId]` — Public user profile page (posts, stats, follow/unfollow)
- `/profile` — Own profile management (avatar, cover, username, full name)
- `/my-posts` — User's own posts with edit/delete
- `/saved` — Saved posts
- `/notifications` — Notifications (mocked)
- `/inbox` — Inbox (mocked)
- `/settings` — Settings
- `/auth` — Dual-panel auth (login + signup)
- `/email-confirmed` — Email confirmation success page

### Key Components
- `AppShell` — Sidebar + Topbar layout wrapper
- `CardItem` — Flip card with 5s countdown, WAAPI animations, clickable author
- `CardGrid` — Masonry grid of CardItems
- `PopupModal` — Post detail modal with like/dislike/save/report + Follow + View Profile
- `FollowButton` — Reusable follow/unfollow button (uses `useFollow` hook)
- `CreatePostModal` — Create new post form
- `ReportModal` — Report post form

### State
- `app/state/ui-state.tsx` — Global UI state via React Context (drawer, popup, toasts, login state)

### Supabase Tables
- `posts` — id, user_id, title, summary, desc, img, ava, author, handle, tag, impressions_count, likes_count, dislikes_count, created_at
- `profiles` — user_id, username, full_name, avatar_url, cover_url, bio (optional), skills text[] (optional)
- `saved_posts` — id, user_id, post_id
- `post_reactions` — user_id, post_id, reaction (like|dislike)
- `post_impressions` — id, post_id, user_id
- `follows` — follower_id, following_id, created_at (composite PK)

### Storage Buckets
- `post-images` — Post cover images (env: `NEXT_PUBLIC_POST_IMAGES_BUCKET`)
- `profile-photos` — Avatar photos (env: `NEXT_PUBLIC_PROFILE_IMAGES_BUCKET`)
- `profile-covers` — Cover photos (env: `NEXT_PUBLIC_COVER_IMAGES_BUCKET`)

### Custom Hooks
- `useFollow(targetUserId)` — Manages follow/unfollow state with Supabase
- `useFocusTrap(ref, active)` — Keyboard focus trap for modals

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SITE_URL` — Production URL (for email redirects)

## Important Setup Notes
- **follows table**: Run `supabase/follows.sql` in the Supabase SQL editor to create the follow system
- **bio & skills columns**: Run `supabase/profile-bio-skills.sql` to enable bio/skills on profiles. The app gracefully falls back if these columns don't exist (About/Skills sections remain hidden or show empty)
- **Email confirmation**: Set Site URL + redirect allowlist in Supabase dashboard for production
- **Supabase RLS**: All tables have Row Level Security enabled with appropriate policies

## Dev Workflow
- Start: `npm run dev` (port 5000)
- Workflows: "Start application" runs `npm run dev`
