import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "tune-game-feel-mechanics-editor",
  title: "Tune Game Feel Without Burning Credits",
  excerpt:
    "Every “make it faster” message costs a credit. Here's the workflow that uses chat for structure and a values panel for feel — with a mobile game-feel checklist.",
  seoTitle: "Tune Game Feel Without Burning AI Credits",
  seoDescription:
    "Stop spending AI credits on tiny tweaks. Use chat for structure and the Mechanics Editor for speed, gravity and spawn rates — with a mobile game-feel checklist.",
  focusKeyword: "tune game feel",
  tags: ["pro-tips", "tutorial", "mobile-game-dev"],
  cover: { file: "cover.webp", alt: "Blueprint-style illustration of a game character with tuning dials for speed, jump height and gravity" },
  screenshots: {
    panel: {
      file: "mechanics-panel.webp",
      alt: "The Pixelfork Mechanics panel open next to the game preview, showing fields for arena size, player size, enemy size, player speed, fire rate and bullet speed",
      credit: "Screenshot: Pixelfork Mechanics panel.",
    },
  },
  graphics: {
    cost: {
      alt: "Comparison of what consumes AI credits and what does not in Pixelfork",
      svg: frame(
        "What costs a credit — and what doesn't",
        "The cheapest workflow follows this table exactly.",
        table(
          ["Action", "Credits"],
          [
            ["First generation of a project", "2"],
            ["Each change made through chat", "1"],
            ["Playing your game in Preview", "None"],
            ["Mechanics Editor value changes (Pro)", "None"],
            ["Editing code in the Code tab", "None"],
            ["Version history: browsing and reverting", "None"],
            ["Publishing and sharing", "None"],
          ],
          { firstWidth: 620, rowHeight: 70 },
        ),
        "Pixelfork credits documentation",
      ),
    },
    values: {
      alt: "Typical values exposed in a mechanics panel: player speed, jump and gravity, enemy spawn, fire rate, level size and scoring",
      svg: frame(
        "What you can usually tune",
        "Exact fields depend on the game you generated.",
        cards([
          { name: "Movement", note: "Player speed and acceleration — the first thing that decides whether a game feels sluggish." },
          { name: "Jump & gravity", note: "Jump height and gravity together define the arc. Tune them as a pair.", accent: C.teal },
          { name: "Enemies", note: "Size, speed and spawn rate: your difficulty dial.", accent: C.green },
          { name: "Weapons", note: "Fire rate and projectile speed decide how powerful the player feels.", accent: C.yellow },
          { name: "Space", note: "Arena or level dimensions change pacing more than you'd expect." },
          { name: "Scoring", note: "Multipliers and timers shape session length and replay pressure.", accent: C.teal },
        ], 3),
      ),
    },
    loop: {
      alt: "Iteration loop: generate with AI, add features in chat, tune values in the panel, playtest, repeat",
      svg: frame(
        "The loop that keeps costs down",
        "AI for the 80%, a values panel for the last 20%.",
        flow([
          { title: "Generate", note: "One strong first prompt" },
          { title: "Chat", note: "Only new systems and fixes" },
          { title: "Tune", note: "Values panel, no credits" },
          { title: "Playtest", note: "On a phone, with thumbs" },
          { title: "Repeat", note: "Revert freely if needed" },
        ]),
      ),
    },
  },
  body: `
Here's a habit that quietly drains an AI game-building budget: typing "make the player a bit faster", waiting for a regeneration, playing it, then typing "actually a little slower". Each message is a credit, and **tuning game feel takes dozens of those adjustments** — that's the nature of feel.

The fix is simple: use chat for structure, and a values panel for numbers.

## Why small chat tweaks are an expensive habit

In Pixelfork, the first generation of a project costs 2 credits and every chat change costs 1. Numeric polish is where the count runs away from you: jump height, gravity, run speed, spawn rate and score pacing usually need ten to thirty passes before a game feels good.

{{img:cost|Most of the work you do after generation is free — if you do it in the right place.}}

## What the Mechanics Editor is

It's a panel in the editor — the gear icon — that exposes the tunable values of your current game as plain editable fields. Change a value, click **Apply to Code**, and the preview updates immediately. It bypasses the AI entirely, so there's no generation wait and no credit spend. Per the credits documentation it's a **Pro plan** feature.

{{img:panel|Values on the right, game on the left: change a number and play it immediately.}}

## What you can usually tune

{{img:values|The fields depend on your game type, but these show up constantly.}}

If a value you want isn't in the panel, ask the chat to add it — for example: *"add camera angle and zoom to game mechanics"*. That's one credit spent once, and every adjustment after it is free.

## The workflow

{{img:loop|Five steps, and only two of them cost anything.}}

1. **Generate with a strong first prompt.** Copy one from the [prompt library](/posts/best-ai-game-prompts-mobile) and adapt it.
2. **Use chat only for structure:** a new enemy type, a power-up, a menu, a bug fix, a scoring system.
3. **Switch to the panel for feel.** Speed, gravity, spawn rate, timers, multipliers.
4. **Playtest on a phone,** not just in the desktop preview. Export an APK when the loop settles — it's the only way to judge touch.
5. **Revert fearlessly.** Browsing version history and reverting don't cost credits, so experiment with confidence.

## A game-feel checklist for mobile

Tuning without a checklist turns into fiddling. Work through these in order:

- **Response.** Does the character react on the same frame as the touch? Anything that feels delayed reads as "broken" to players, not "heavy".
- **Readability at arm's length.** Play at a normal phone distance. Can you tell obstacles from background at a glance?
- **Jump arc.** Tune jump height and gravity together. A floaty jump is usually too little gravity, not too little height.
- **Forgiveness.** A few frames of coyote time and a small input buffer make a platformer feel fair without making it easier.
- **Difficulty ramp.** Increase one variable at a time — speed or spawn rate, not both.
- **Session length.** Decide the target (30 seconds, 3 minutes) and tune timers and score pacing to hit it.
- **Failure clarity.** The player should always know why they died. If they don't, it's a readability problem, not a balance problem.

## What still needs chat (or the code tab)

The panel changes values, not behaviour. These still belong in chat:

- New mechanics and systems ("add a dash with a cooldown").
- UI and flow ("add a pause menu", "show best score on the game-over screen").
- Art and style changes, or swapping in your own assets.
- Bug fixes and refactors.

Advanced users can also edit the generated JavaScript in the Code tab directly — also free of credits — which is often the fastest way to make a precise change you'd otherwise describe three times.

## A note on plans

The Mechanics Editor is documented as a Pro feature. Free (5 credits a month) and Lite (50 credits, $15) can still generate and iterate through chat, but the no-credit tuning loop described here is part of Pro (100 + 20 credits, $25). Check [the credits documentation](https://docs.pixelfork.ai/docs/understanding-credits) for the current plan details before you decide.

## FAQ

### Does the Mechanics Editor use credits?

No. Pixelfork's credits documentation lists Mechanics Editor value changes among the actions that don't consume credits, along with playing the preview, editing code, browsing version history and publishing.

### Is it available on Free or Lite plans?

The credits documentation lists the Mechanics Editor as Pro only. On Free or Lite you can still iterate through chat, where each change costs a credit.

### What if the value I need isn't in the panel?

Ask the AI to expose it. A message such as "add camera angle and zoom to game mechanics" adds the fields to the panel; after that, adjusting them is free.

### Can I break my game with bad values?

You can make it unplayable — gravity at zero, spawn rate at a hundred — but nothing is destroyed. Set the value back, or use version history to revert; both are free.

### Should I tune before or after testing the APK?

Both. Do a first pass in the browser preview to get in the right range, then export an APK and re-tune on a real phone. Touch input and screen size change what "fast" feels like.

### How is this different from editing the code directly?

The panel exposes a curated set of values with instant apply, which is ideal for quick iteration. The Code tab gives you everything, which is better for precise or structural changes. Neither costs credits.

Generate once, then stop paying for micro-tweaks: [open your game in Pixelfork](https://pixelfork.ai), hit the gear icon, and tune the feel until it plays well in your hand.
`,
};

export default post;
