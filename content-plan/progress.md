# Priority 1 articles — progress

Paused 2026-09-13 to deploy the blog. Resume from here.

## How the system works
- Each article is a package: `content/posts/<slug>/post.mts` (+ `cover.webp`). Type: `content/posts/types.ts`.
- Infographic helpers: `scripts/lib/graphics.mts` (frame, flow, cards, table, bars, cycle, placeholderSvg).
- Preview infographics: `npm run post:preview -- <slug> [outDir]`
- Publish to the DB: `npm run post:publish -- <slug> | --all [--draft] [--replace]`
- Covers: generated in the ChatGPT app (Work mode, project "Game Prompt and Visuals"), style block in the chat "Generate 12 blog cover images". Originals in `../Images X/covers/`.

## Status
| # | Slug | Cover | Written | Published |
|---|---|---|---|---|
| 1 | how-to-make-a-roblox-game | ✅ | ✅ (3 Roblox Studio screenshot placeholders — capture from RobloxStudio app) | ❌ |
| 2 | what-is-an-npc | ✅ | ✅ | ❌ |
| 3 | how-to-make-a-video-game | ✅ | ✅ | ❌ |
| 4 | game-design-document-template | ✅ | ✅ | ❌ |
| 5 | pixel-art-for-games | ✅ | ❌ | ❌ |
| 6 | godot-vs-unity | ✅ | ❌ | ❌ |
| 7 | unity-vs-unreal | ✅ | ❌ | ❌ |
| 8 | how-to-make-a-mobile-game | ✅ | ❌ | ❌ |
| 9 | best-game-engine-for-beginners | ✅ | ❌ | ❌ |
| 10 | how-to-make-a-game-with-ai | ✅ | ❌ | ❌ |
| 11 | procedural-generation | ✅ | ❌ | ❌ |
| 12 | game-testing | ✅ | ❌ | ❌ |

## Next steps
1. Write posts 5–12 (written posts already link to `/posts/game-testing`, `/posts/best-game-engine-for-beginners`, `/posts/how-to-make-a-game-with-ai`, `/posts/pixel-art-for-games`, `/posts/how-to-make-a-mobile-game` — keep those slugs).
2. Preview all infographics, fix layout issues.
3. Capture real screenshots (Roblox Studio, Unity Hub, GDevelop are installed) to replace placeholders.
4. `npm run post:publish -- --all` locally, check in the browser, then run against production DB.
