import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "how-to-make-a-roblox-game",
  title: "How to Make a Roblox Game: A Beginner's Guide",
  excerpt:
    "Learn how to make a Roblox game from scratch: install Roblox Studio, build an obby with parts, add Luau scripts, playtest, publish and start earning Robux.",
  seoTitle: "How to Make a Roblox Game (Step-by-Step Beginner's Guide)",
  seoDescription:
    "Learn how to make a Roblox game from scratch: install Roblox Studio, build an obby, write your first Luau script, playtest, publish and monetize it.",
  focusKeyword: "how to make a roblox game",
  tags: ["tutorial", "3d-game", "monetization"],
  featured: true,
  cover: { file: "cover.webp", alt: "Illustration of a floating obstacle course built from bright bricks, with a small blocky character jumping between platforms" },
  graphics: {
    workflow: {
      alt: "The six steps to make a Roblox game: install Roblox Studio, pick a template, build with parts, script with Luau, playtest and publish",
      svg: frame(
        "How a Roblox game gets made",
        "The same six steps work for an obby, a tycoon or a simulator.",
        flow([
          { title: "Install Studio", note: "Free on Windows and Mac" },
          { title: "Pick a template", note: "Baseplate or a genre starter" },
          { title: "Build with parts", note: "Blocks, terrain and models" },
          { title: "Script in Luau", note: "Add rules and interaction" },
          { title: "Playtest", note: "Play, fix, repeat" },
          { title: "Publish", note: "Make it public and share" },
        ]),
      ),
    },
    "script-types": {
      alt: "Comparison of Roblox Script, LocalScript and ModuleScript: where each runs, where to put it and what it is for",
      svg: frame(
        "Script, LocalScript or ModuleScript?",
        "Where your code runs decides what it can do.",
        table(
          ["", "Script", "LocalScript", "ModuleScript"],
          [
            ["Runs on", "The server", "The player's device", "Wherever it is required"],
            ["Put it in", "ServerScriptService", "StarterPlayerScripts, GUIs", "ReplicatedStorage"],
            ["Use it for", "Game rules, data, rewards", "Camera, input, UI", "Shared, reusable code"],
            ["Players can see it?", "No", "Yes, it's on their device", "Depends where it lives"],
            ["Trust it with Robux?", "Yes", "Never", "Only from a Script"],
          ],
          { firstWidth: 330, rowHeight: 92 },
        ),
        "Roblox Creator Documentation",
      ),
    },
    monetization: {
      alt: "Four ways to earn Robux from a Roblox game: game passes, developer products, Premium Payouts and paid private servers",
      svg: frame(
        "4 ways to earn Robux from your game",
        "Most successful experiences combine two or three of these.",
        cards([
          { name: "Game passes", mono: "One-time purchase", note: "Permanent perks such as a double-jump, a VIP area or a special tool." },
          { name: "Developer products", mono: "Buy again and again", note: "Consumables like coins, extra lives or a skip-stage button.", accent: C.teal },
          { name: "Premium Payouts", mono: "Paid for engagement", note: "Earn based on how much time Roblox Premium members spend in your game.", accent: C.green },
          { name: "Private servers", mono: "Monthly subscription", note: "Players pay to play with only their friends in their own server.", accent: C.yellow },
        ]),
        "Roblox Creator Documentation",
      ),
    },
  },
  placeholders: {
    "studio-templates": { what: "Roblox Studio: the New experience screen with templates", how: "Open Roblox Studio → New → template grid (crop out the account name)" },
    "studio-explorer": { what: "Roblox Studio: obby parts in the viewport with Explorer and Properties", how: "Baseplate template with a few parts, Anchored ticked in Properties" },
    "studio-script": { what: "Roblox Studio: the kill brick script in the script editor", how: "Script inside a part, code from this article visible" },
  },
  body: `
Roblox is one of the easiest places to publish your first game. The tools are free, millions of players are already there, and you can go from an empty world to a playable game in an afternoon. This guide shows exactly **how to make a Roblox game** step by step: installing Roblox Studio, building a simple obstacle course (an "obby"), writing your first script, testing it and publishing it for everyone to play.

You don't need any coding experience to follow along. By the end you will have a working game and know what to learn next.

{{img:workflow|The full Roblox game workflow at a glance.}}

## What you need before you start

- **A Roblox account.** It's free. You'll use it to sign in to Roblox Studio and to publish.
- **A computer running Windows or macOS.** Roblox Studio isn't available on phones, tablets or Chromebooks.
- **About two hours** for your first obby, including testing.

Roblox calls games **experiences**, so you'll see both words used. They mean the same thing here.

## Step 1: Install Roblox Studio

Roblox Studio is the free editor used to build every game on Roblox. Download it from the Roblox Creator Hub, install it and sign in with your Roblox account.

When Studio opens, you'll see a set of templates. Templates are starter projects: some are almost empty, others include a whole map you can learn from.

{{img:studio-templates|Roblox Studio's templates screen, where every new game starts.}}

For your first game, pick **Baseplate**. It gives you a flat grey floor, a spawn point and nothing else, so it's easy to see what you're building.

## Step 2: Learn the four windows that matter

Studio has a lot of buttons, but you only need four areas to get started:

1. **Viewport.** The 3D view of your world in the middle. Hold the right mouse button to look around and use **W A S D** to fly.
2. **Explorer.** A tree of everything in your game: parts, scripts, lighting, players. If something exists, it's in the Explorer.
3. **Properties.** Settings for whatever you selected, such as size, color, material and whether it can move.
4. **Toolbox.** Free models, images and audio made by Roblox and the community.

If a window is missing, open it from the **View** tab.

## Step 3: Build your first obby

An obby is a series of jumps and obstacles players must get through without falling. It's the classic first Roblox game because it only needs basic parts.

1. On the **Home** tab, click **Part** to add a block to the world.
2. Use the **Move**, **Scale** and **Rotate** tools to shape it into a platform.
3. In **Properties**, tick **Anchored**. Anchored parts don't fall or get pushed around. Forgetting this is the most common beginner mistake: your whole course collapses when the game starts.
4. Change **Color** and **Material** so platforms are easy to see.
5. Duplicate the platform (**Ctrl+D** on Windows, **Cmd+D** on Mac) and move each copy a little further away and higher.

Start with easy jumps and make them harder as players go. Test the distance often: a jump that looks fine in the editor can be impossible in play.

{{img:studio-explorer|Parts in the viewport, with the Explorer and Properties windows on the right.}}

**Tip:** group related parts into a **Model** (select them and press **Ctrl+G** / **Cmd+G**) and give it a clear name in the Explorer, like *Stage1*. Your project stays tidy as it grows.

## Step 4: Write your first Luau script

Scripts make things happen. Roblox uses **Luau**, a fast and beginner-friendly language based on Lua.

Let's make a **kill brick**: a red part that sends players back to the start when they touch it.

1. Add a new part, make it red and anchor it.
2. In the Explorer, hover over the part, click **+** and choose **Script**.
3. Replace the code with:

\`\`\`lua
-- Kill brick: resets any player who touches this part
local part = script.Parent

part.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChildWhichIsA("Humanoid")
	if humanoid then
		humanoid.Health = 0
	end
end)
\`\`\`

Here's what it does: \`script.Parent\` is the part the script lives in. \`Touched\` fires when anything bumps into it. If the thing that touched it belongs to a character with a **Humanoid**, the script sets its health to zero, and the player respawns.

{{img:studio-script|The kill brick script inside Roblox Studio's script editor.}}

### Script, LocalScript or ModuleScript?

As your game grows you'll meet three kinds of scripts. The difference is **where the code runs**.

{{img:script-types|Pick the script type by where the code needs to run.}}

The rule to remember: anything that matters to fairness, like giving coins, saving progress or handling purchases, belongs in a server **Script**. Code on a player's device can be tampered with.

## Step 5: Add checkpoints

Long obbies need checkpoints so players don't restart from the very beginning.

1. In the **Model** tab, add a **SpawnLocation** at the start of each stage.
2. In the Explorer, add a **Team** under the **Teams** service for each checkpoint and give each team a different **TeamColor**.
3. On each SpawnLocation, set **TeamColor** to match its team, untick **Neutral** and tick **AllowTeamChangeOnTouch**.

Now when a player touches a checkpoint, they join that team and respawn there next time.

## Step 6: Playtest your game

Click **Play** on the **Home** tab (or press **F5**) to jump into your game as a player. Try every jump. Then click **Stop** to go back to editing.

While you test, watch for:

- **Jumps that are too long.** If you fail a jump five times, players will quit.
- **Missing anchors.** Anything that falls at the start needs **Anchored** ticked.
- **Errors in the Output window.** Open it from **View → Output**. Red text points to the line of code that broke.

Ask a friend to play too. Watching someone else play shows problems you'll never notice yourself. We cover this in depth in our [game testing guide](/posts/game-testing).

## Step 7: Publish your Roblox game

1. Go to **File → Publish to Roblox**.
2. Give your game a clear name and description. Use words players actually search for, like "obby", "parkour" or "escape".
3. After publishing, open **Game Settings** in Studio or your experience in the Creator Hub, and change it from **private** to **public**.
4. Add a thumbnail and an icon. These are the first things players see, and they strongly affect how many people click to play.

Congratulations: your game is live. Share the link with friends and in communities where your players are.

## How to make money from your Roblox game

Players spend **Robux**, Roblox's virtual currency, inside experiences. You can earn Robux in several ways:

{{img:monetization|The main ways to earn Robux, and what each is best for.}}

- **Game passes** for permanent perks, like a VIP area or a speed coil.
- **Developer products** for things players can buy again, like coins or a stage skip.
- **Premium Payouts**, based on how much time Roblox Premium members spend in your game.
- **Paid private servers**, so groups of friends can play together.

Eligible creators can exchange earned Robux for real money through the **Developer Exchange (DevEx)** program. The age, balance and account requirements change from time to time, so check the current rules in the Creator Hub before you plan around it.

The golden rule is the same as in any game: keep it fun and fair first. Players leave games that feel pay-to-win. For more ideas, read our guide to [monetization strategies for indie games](/posts/monetization-strategies-for-indie-mobile-games).

## Tips to make your Roblox game stand out

- **Start small.** A polished 10-stage obby beats an unfinished open world.
- **Make the first minute great.** Players decide quickly whether to stay, so put a fun moment right at the start.
- **Update often.** New stages, events and items give players a reason to come back.
- **Listen to players.** Add a simple way to leave feedback, like a group or a Discord server.
- **Learn from the templates.** Open a genre template, such as a racing or obby starter, and study how its scripts work.

## What to learn next

Once your obby works, try these next steps:

1. **Leaderboards** that show stages completed or time.
2. **Saving progress** with DataStores, so players keep their stage between visits.
3. **User interface** with ScreenGuis, like a timer or a shop.
4. **Sound and effects** to make jumps and checkpoints feel good.

If you want to go beyond Roblox, compare engines in [the best game engine for beginners](/posts/best-game-engine-for-beginners) or follow our [step-by-step guide to making a video game](/posts/how-to-make-a-video-game).

## FAQ

### Is it free to make a Roblox game?

Yes. Roblox Studio is free, and publishing a game costs nothing. You only pay if you choose to, for example to advertise your game or buy paid assets.

### Do I need to know how to code?

No. You can build a complete obby with parts and a few copy-and-paste scripts. Learning Luau lets you make more complex games, and it's one of the friendlier languages to start with.

### How long does it take to make a Roblox game?

A simple obby takes a few hours. A game with shops, saving and many levels can take weeks or months, especially if you keep updating it after launch.

### Can you make a Roblox game on a phone or Chromebook?

No. Roblox Studio runs on Windows and macOS only. You can play Roblox on phones, tablets and consoles, but building requires a computer.

### How do Roblox developers make money?

Mostly by selling game passes and developer products for Robux, plus Premium Payouts. Eligible creators can cash out Robux through the Developer Exchange program.

Ready to build more games, on Roblox or anywhere else? [Create and share your game with Pixelfork](https://pixelfork.ai).
`,
};

export default post;
