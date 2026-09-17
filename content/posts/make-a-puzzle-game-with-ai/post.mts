import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "make-a-puzzle-game-with-ai",
  title: "Make a Puzzle Game with AI (No Coding)",
  excerpt:
    "Sort, match and grid puzzles are a great fit for AI generation. Here's how to pick a ruleset, prompt it clearly, keep difficulty fair and test it on a phone.",
  seoTitle: "Make a Puzzle Game with AI: Sort, Match and Grid Ideas",
  seoDescription:
    "Make a mobile puzzle game with AI and no coding: pick a ruleset, use the right first prompt, design fair difficulty, and test readability on a real phone.",
  focusKeyword: "make puzzle game with ai",
  tags: ["tutorial", "mobile-game-dev", "2d-game"],
  cover: { file: "cover.webp", alt: "Paper-cut illustration of a puzzle board with coloured pieces being matched" },
  graphics: {
    subgenres: {
      alt: "Four mobile puzzle subgenres compared: match and clear, sort and stack, slide and arrange, and logic and pipes",
      svg: frame(
        "Pick one ruleset for version one",
        "Mixing two rulesets is the most common reason a puzzle prototype stalls.",
        cards([
          { name: "Match & clear", note: "Swap adjacent pieces to make lines of three or more. Familiar, forgiving, easy to read." },
          { name: "Sort & stack", note: "Move items between containers until each holds one colour. Calm, very mobile-friendly.", accent: C.teal },
          { name: "Slide & arrange", note: "Push tiles into position within a fixed board. Small boards, deep thinking.", accent: C.green },
          { name: "Logic & pipes", note: "Rotate or connect pieces until a path completes. Clear win state, no timers needed.", accent: C.yellow },
        ]),
      ),
    },
    clarity: {
      alt: "Rules clarity checklist for puzzle games: visible goal, obvious interaction, clear feedback, undo and celebration",
      svg: frame(
        "Rules clarity beats content",
        "A puzzle that has to be explained has a design problem, not a tutorial problem.",
        table(
          ["Question", "What players need to see"],
          [
            ["What am I trying to do?", "The goal on screen at all times, in words or icons"],
            ["What can I touch?", "Interactive pieces look different from decoration"],
            ["Did that work?", "Immediate feedback: motion, sound, a counter change"],
            ["How am I doing?", "Moves or time left, and progress toward the goal"],
            ["Can I undo that?", "One undo, if the ruleset punishes misclicks"],
            ["Did I win?", "A clear win state that feels like a small celebration"],
          ],
          { firstWidth: 420, rowHeight: 74 },
        ),
      ),
    },
    difficulty: {
      alt: "How to increase puzzle difficulty without rewriting the game: constraints, new piece types, board size and layered goals",
      svg: frame(
        "Difficulty without a rewrite",
        "In that order — the first two are free, the last two cost design time.",
        flow([
          { title: "Tighten limits", note: "Fewer moves or less time" },
          { title: "Add a piece type", note: "One blocker or special" },
          { title: "Change the board", note: "Size and shape" },
          { title: "Layer goals", note: "Two objectives at once" },
        ]),
      ),
    },
  },
  body: `
Puzzle games are one of the best genres to **make with AI**, because what makes them good is rules and readability rather than physics feel or animation polish. A model can scaffold a board, piece types and a win check quickly. Your job is the part it can't do: deciding what the rules mean and whether the difficulty is fair.

This guide walks through picking a subgenre, prompting it, keeping the board readable on a phone, and testing before you publish.

## Pick one subgenre for version one

{{img:subgenres|Four rulesets that work well on mobile. Choose exactly one.}}

The scope rule for puzzles: **one ruleset, then levels**. Ten handmade levels of one clear ruleset beat two rulesets that each half-work.

## The first prompt formula

Puzzle prompts need six things: board, pieces, the interaction, the win condition, the limit, and the art direction. Choose **Mobile / Tablet** before generating so touch targets are sized for thumbs.

\`\`\`text
Make a mobile puzzle game with a 7x7 grid of coloured gems, viewed top-down.
Tap two adjacent gems to swap them; three or more in a line clear and new gems
fall from the top.
The player has 20 moves to reach a target score shown at the top of the screen.
Art style: soft rounded gems with distinct shapes as well as colours,
calm blue background, high contrast.
No automatic matches at the start of a level.
\`\`\`

Two more starters:

- **Sort:** *"Make a colour-sorting puzzle: 8 tubes holding stacked coloured balls, tap one tube then another to move the top ball. A tube is complete when it holds four balls of one colour. Level is won when every tube is single-coloured or empty."*
- **Logic:** *"Make a pipe-connection puzzle on a 5x5 grid. Tap a tile to rotate it. The level is won when water flows from the source tile to the drain tile. Show the flow animating along connected pipes."*

## Rules clarity pass

{{img:clarity|Answer these six questions on screen and your tutorial mostly disappears.}}

Good follow-up prompts:

1. "Show the level goal and remaining moves at the top of the screen at all times."
2. "Add a subtle highlight to the pieces that can currently be moved."
3. "Add a win screen with the moves left and a next-level button."
4. "Make each colour also use a distinct shape so the board works for colourblind players."

## Difficulty without rewriting the game

{{img:difficulty|Escalate in this order and you rarely need a regeneration.}}

Tighter limits and board size usually live in the Mechanics panel, so they cost no credits — see [tuning game feel without burning credits](/posts/tune-game-feel-mechanics-editor). New piece types and blockers are structural, so they belong in chat.

When the core feels right, ask for progression: *"add a level select screen with five levels of increasing difficulty"*. Doing that before the ruleset is solid means re-tuning every level later.

## Fairness: the thing players actually complain about

- **No unwinnable boards.** Ask explicitly: *"never generate a board with no valid moves; reshuffle instead."*
- **No luck-only wins.** If a level can only be beaten by a lucky cascade, tighten the goal or loosen the move limit.
- **Deterministic where it matters.** Randomness in what falls next is fine; randomness in whether the level is possible is not.
- **Respect the undo.** If a single misclick can ruin a two-minute puzzle, add one undo.

## Accessibility and readability on phones

- Colour plus shape, never colour alone.
- Touch targets around 44 points minimum; small gems are the top cause of misclicks.
- Enough contrast between pieces and background to survive outdoor light.
- Animations short enough that a fast player isn't waiting — 150 to 250 ms for a swap.

Our [2D art pipeline notes](/posts/2d-game-art-pipeline-pro-tips) cover keeping a consistent look once you replace the generated art with your own.

## Share, test and export

1. **Publish a playable link** and watch three people play level one without help.
2. **Export an APK** and check touch precision on a real phone — puzzle games live or die on accurate taps.
3. **Export an AAB** when you're ready for the Play Console ([APK vs AAB](/posts/apk-vs-aab-for-indie-games), then [closed testing](/posts/google-play-closed-testing-ai-games)).

## Designing ten levels without burning out

One ruleset plus ten hand-tuned levels is a complete small game. A workflow that keeps it manageable:

1. **Levels 1–2 teach.** No failure pressure. The player learns the interaction by doing it.
2. **Levels 3–5 add one twist each.** A blocker, a tighter move limit, a new piece type. One at a time.
3. **Levels 6–8 combine** two things the player already knows.
4. **Levels 9–10 are the exam.** Harder, but using nothing new.

Ask chat for the level system once — *"add a level select with ten levels, each with its own board layout, move limit and target"* — then tune the numbers per level in the values panel where it costs nothing.

Write each level's intent in a sentence before you build it ("teach that blockers need two adjacent matches"). Levels without an intent are where difficulty curves go wrong.

## Hints, undo and the difficulty curve

Puzzle players quit at frustration, not at difficulty. Three cheap mitigations:

- **One undo**, if a misclick can ruin a long solve.
- **A gentle hint** after inactivity: highlight a valid move rather than solving the level.
- **A retry that's instant**, keeping the same board so the player can apply what they learned.

And one anti-pattern to avoid: random boards that are occasionally impossible. Ask explicitly for a reshuffle when no valid move exists, and for boards that don't start with automatic matches.

## Progression and meta, in that order

Once the ten levels hold up:

- **Stars or a score per level** give replay value at almost no cost.
- **A level map** makes progress visible.
- **Daily puzzles** are a strong retention hook — and a big content commitment, so only add them if you're committed to generating them.
- **Hints as a purchase** is the classic puzzle monetisation, which means [native in-app purchases](/posts/add-ads-and-iap-after-android-studio-export). Don't build the economy until the puzzles are good.

## A playtest script for puzzles

Puzzle testing is quiet work; watch hands, not faces:

1. Give them level one with no explanation. Time how long until the first correct move.
2. Ask what they think the goal is after level two.
3. Note every level where they stop and stare for more than ten seconds — that's either good difficulty or bad readability, and their next sentence tells you which.
4. Ask which level was most satisfying, and why.

If several testers describe a different rule than the one you implemented, the board is teaching the wrong thing. That's a design fix, not a tutorial fix.

## Saving progress

Puzzle players expect to come back to where they left off, which means persistence — a small feature with a big retention effect. Ask for it explicitly: *"save the highest level completed and the stars earned per level on the device, and restore them when the game starts."*

Two details worth requesting at the same time: don't lose progress if the app is backgrounded mid-level, and keep the save simple enough that a future update doesn't invalidate it.

## Sound in puzzle games

Audio carries more weight here than in action games, because the pace is slow enough to notice it:

- **One satisfying clear sound**, pitched up slightly for combos.
- **A gentle invalid-move sound** — quiet enough not to scold.
- **A short win sting** that gives the level a sense of closure.
- **No looping music by default.** Many puzzle players play muted or alongside other audio; make music opt-in.

## FAQ

### Can AI make a match-3 with special gems on day one?

It can usually produce a working swap-and-clear board quickly. Special pieces — bombs, line clears, colour bombs — are best added one at a time as follow-ups, because each one interacts with the clear logic.

### How do I add levels without spending a lot of credits?

Get one level exactly right first, then ask for a level system in a single structural message. After that, tune per-level numbers (move limits, targets, board size) in the Mechanics panel where changes don't cost credits.

### 2D or 3D for a puzzle game?

2D almost always. Clarity is the entire game, and a flat board is easier to read on a phone. Use 3D only when depth is part of the puzzle itself.

### Can I use my own sprite sheet or artwork?

Yes. Upload images in the Assets tab and mention them with @ in your prompt so the AI uses them for the pieces and background.

### When should I export to Android Studio?

Only when you need native features — ads, in-app purchases, Play Games Services. For a straightforward puzzle release, the AAB export is enough.

### How do I stop levels from feeling randomly unfair?

Tell the generator explicitly to avoid unwinnable boards and reshuffle instead, keep the goal reachable with a couple of moves to spare in playtests, and watch real players: if several fail the same level for different reasons, the level is noisy, not hard.

Pick one ruleset, paste a starter prompt into [Pixelfork on Mobile / Tablet](https://pixelfork.ai), and get a playable link in front of three people today.
`,
};

export default post;
