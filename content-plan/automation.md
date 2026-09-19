# Article automation playbook

The scheduled task "Pixelfork blog article" runs this playbook (Mon/Wed/Fri 15:00). One article per run, always as a **draft**.
A human reviews and publishes in https://www.pixelfork.ai/blog/admin.

Project: `/Users/fkhasiyev/Documents/Pixelfork - Claude/Blog`

## Hard rules
- One article per run. Never publish, delete or edit live posts. The API only allows drafts anyway.
- Never print, log, copy or commit secrets. Keys live in the macOS Keychain (account `pixelfork-blog`):
  `PIXELFORK_BLOG_TOKEN` (Publishing API) and `GEMINI_API_KEY` (Nano Banana 2 covers). The scripts read them.
- Image policy: AI only for the cover. Inside articles use code-built infographics (`scripts/lib/graphics.mts`),
  real screenshots, or "attention required" placeholders. Never AI images of real software, UIs or products.
- No invented statistics, prices, dates or quotes. If a fact is uncertain, verify it with a web search or leave it out.
  Phrase fast-changing details (pricing, revenue shares, version numbers) as "at the time of writing" and point to the official page.
- Budget: at most 2 cover generations and about 50 OpenSEO credits per run. Stop and report if something fails twice.

## Steps
1. **Pick the topic.** Open `content-plan/progress.md`. Take the first row in the queue with status `todo`.
   Details (target keyword, volume, KD) are in `content-plan/topics.md`.
2. **Check it isn't live.** `curl -s https://www.pixelfork.ai/blog/sitemap.xml` and make sure the slug isn't there.
3. **Keyword research (OpenSEO, US/en).** `get_keyword_metrics` for the target keyword plus 5–10 close variants; pick
   secondary keywords and FAQ questions from `research_keywords` (limit ~20 results).
4. **Internal links.** From the sitemap, choose 3–6 relevant live posts to link (`/posts/<slug>`). Also link planned
   Priority 1 slugs only if they're already in the sitemap.
5. **Write the package** `content/posts/<slug>/post.mts` (type: `content/posts/types.ts`; examples:
   `content/posts/what-is-an-npc/post.mts`, `content/posts/how-to-make-a-video-game/post.mts`):
   - Title ≤ 60 characters with the focus keyword; excerpt and seoDescription 120–160 characters; seoTitle ≤ 60.
   - 1,500–2,200 words, Markdown `body`, H2/H3 structure, focus keyword in the first paragraph and one H2,
     short paragraphs, practical steps, a FAQ section (3–5 questions from real searches), and a closing link to https://pixelfork.ai.
   - **Comparison articles** (X vs Y, "best engine for…"): keep the competitor keyword as the focus keyword, but give Pixelfork
     its own H2 as a genuine third option, honest about what it does not do. Target `game engine without coding`,
     `unity alternative` and `godot alternative` in that section. Never rename the article to "Pixelfork vs X" —
     brand-comparison terms have no measurable US volume yet (checked 2026-09-19).
   - Tags: 1–3 existing tag slugs (tutorial, insights, mobile-game-dev, pro-tips, monetization, distribution, 3d-game, threejs, 2d-game).
   - 2–4 infographics from `scripts/lib/graphics.mts` (flow, cards, table, bars, cycle) with descriptive alt text.
   - Screenshots of real apps: if the app is installed (RobloxStudio, Unity Hub, GDevelop 5, Blender) and computer use
     is available, capture the real screen (crop out personal info) into the package and reference it in `screenshots`.
     Otherwise add a `placeholders` entry saying exactly what is needed.
6. **Check the images.** `npm run post:preview -- <slug> /tmp/<slug>-preview` and look at every PNG: no overlapping
   or clipped text, readable sizes. Fix and re-render until clean.
7. **Cover (art direction).** Existing `content/posts/<slug>/cover.webp` files from before 2026-09-13 are the old dark
   style: replace them. Decide the cover type:
   - **B, real product** (the article is about a specific existing game, engine, app or store, e.g. Unity, Roblox, Godot, Steam):
     AI can't depict it. Don't generate. Send the draft without a cover (delete the old `cover.webp` or leave `cover.file` pointing
     to a missing file) and ask the user in the report for a real screenshot or official press image.
   - **C, graphic** (lists, rankings, comparisons, performance, systems): `npm run cover:graphic -- <slug> <gauge|network|document|bars> <#color1> <#color2>`
     with a vivid two-color gradient that differs from recent covers.
   - **A, illustration** (everything else): pick a style from `scripts/lib/cover-styles.mts` that fits the topic and wasn't used by
     the previous 2 articles (check `content-plan/image-log.csv`), then `npm run cover -- <slug> "<one-sentence subject>" --style <style>`.
     Available styles: vibrant-diorama, flat-vector, pixel-art, paper-cut, blueprint, cinematic-3d. **Never use neon or clay styles** (the user dislikes them).
   Look at the result: no text, letters, numbers or logos; subject fits the topic; colorful. Regenerate once at most.
   Never put the title on the cover image; the site adds it (hero card and social images).
8. **Type check.** `npx tsc --noEmit` must pass.
9. **Send the draft.** `npm run post:send -- <slug>`. It refuses duplicates and prints the admin edit link.
10. **Record it.** In `content-plan/progress.md` set the row to `draft` with today's date. Commit the package and
    progress file (`git add content/posts/<slug> content-plan && git commit -m "Draft: <title>"`) and `git push`.
    If push fails, keep the local commit and mention it in the report.
11. **Report** (short): title, admin edit link, word count, focus keyword (volume/KD), internal links used,
    anything that needs the user (placeholders to replace, facts to double-check), and cover cost from
    `content-plan/image-log.csv`.

## If something blocks the run
- Mac asleep, no network, or a missing Keychain item: stop, change nothing, report what's missing.
- API 401/403: the token was revoked or lacks a scope, ask the user for a new token (Admin → API tokens).
- API 429: daily limit reached; stop and report.
