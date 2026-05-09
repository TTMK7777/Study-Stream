# This is NOT the Next.js you know

This project uses Next.js 16 + React 19 + Tailwind v4. APIs, conventions, and file structure may all differ from your training data — read the relevant guide in `node_modules/next/dist/docs/` before writing any code, and heed deprecation notices.

## Project specifics

- Package manager: npm
- Database: Supabase Postgres + Drizzle ORM (Lazy Proxy in `src/db/index.ts`)
- Auth: Supabase Auth (Email magic link)
- Hosting: Vercel
- Test: Vitest (`tests/**/*.test.ts`)
- Branch policy: **main 直 push 禁止**。機能ブランチ + PR、PR タイトル `feat:` / `fix:` / `chore:` / `docs:`
- Reference repo: `C:\Users\ttsuj\Desktop\book-recording`（同じスタックで先行運用中）

## API Routes

- Use `Response.json()` (NOT `NextResponse.json()`) — Next.js 16 仕様
- API キーやサービスロールキーをクライアントに漏らさない（`NEXT_PUBLIC_` プレフィックス禁止）
