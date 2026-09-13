import type { PostPackage } from "../types.ts";
import { C, cards, cycle, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "what-is-an-npc",
  title: "What Is an NPC in Video Games?",
  excerpt:
    "What is an NPC? Learn what non-player characters are, the main types of NPCs in games, how NPC AI works, and how to design NPCs players remember.",
  seoTitle: "What Is an NPC? Non-Player Characters in Games Explained",
  seoDescription:
    "What is an NPC? Learn what non-player characters are, the main NPC types, how NPC AI works (state machines, behavior trees) and how to design great NPCs.",
  focusKeyword: "what is an npc",
  tags: ["insights", "pro-tips"],
  cover: { file: "cover.webp", alt: "Illustration of a tiny village square with three friendly characters, each with a glowing orange marker above their head" },
  graphics: {
    types: {
      alt: "Six common types of NPCs: quest givers, merchants, companions, enemies, ambient characters and tutorial guides",
      svg: frame(
        "6 common types of NPCs",
        "Most NPCs do one clear job for the player.",
        cards(
          [
            { name: "Quest givers", note: "Hand out goals and push the story forward." },
            { name: "Merchants", note: "Buy, sell and upgrade items for the player.", accent: C.teal },
            { name: "Companions", note: "Travel, fight or solve puzzles with you.", accent: C.green },
            { name: "Enemies", note: "Challenge the player. Often simpler AI than they look.", accent: C.red },
            { name: "Ambient NPCs", note: "Crowds and villagers that make a world feel alive.", accent: C.yellow },
            { name: "Guides", note: "Teach controls and mechanics without a manual.", accent: C.muted },
          ],
          3,
        ),
      ),
    },
    "state-machine": {
      alt: "A guard NPC state machine that cycles between patrol, suspicious, chase, attack and return states",
      svg: frame(
        "A guard NPC as a state machine",
        "The NPC is always in exactly one state. Events move it to the next.",
        cycle("Guard NPC", [
          { title: "Patrol", note: "Walk between waypoints" },
          { title: "Suspicious", note: "Heard a noise: go look" },
          { title: "Chase", note: "Sees the player" },
          { title: "Attack", note: "Player is in range" },
          { title: "Return", note: "Lost the player: go home" },
        ], { cy: 530, r: 260 }),
      ),
    },
    "ai-techniques": {
      alt: "Comparison of NPC AI techniques: finite state machines, behavior trees, utility AI and goal-oriented action planning",
      svg: frame(
        "How NPC brains are built",
        "Start simple. Most games ship with the first two.",
        table(
          ["", "State machine", "Behavior tree", "Utility AI", "GOAP"],
          [
            ["Idea", "Switch between states", "Tree of tasks", "Score every option", "Plan steps to a goal"],
            ["Good for", "Guards, simple enemies", "Most action games", "Sims, survival", "Tactical enemies"],
            ["Difficulty", "Easy", "Medium", "Medium", "Hard"],
            ["Grows well?", "Gets messy", "Yes", "Yes", "Yes"],
          ],
          { firstWidth: 220, rowHeight: 104 },
        ),
      ),
    },
  },
  body: `
If you play video games, you meet NPCs constantly: the shopkeeper who sells you potions, the villager who asks for help, the guard who chases you across the rooftops. But **what is an NPC**, exactly, and how do games make them feel alive?

This guide explains what NPCs are, the main types you'll find in games, how NPC artificial intelligence works behind the scenes and how to design NPCs that players actually remember. It's written for players who are curious and for anyone making their first game.

## What does NPC stand for?

**NPC stands for non-player character.** It's any character in a game that isn't controlled by a player. Instead, the game itself controls it, using scripts, rules or artificial intelligence.

The term comes from tabletop role-playing games like *Dungeons & Dragons*. Players controlled their own heroes, while the game master voiced everyone else: the innkeeper, the king, the dragon. Those were the non-player characters. Video games borrowed the idea, and the computer took over the game master's job.

**Is an enemy an NPC?** Technically, yes. Anything not controlled by a player counts. In everyday use, though, many players and developers say "NPC" mostly for friendly or neutral characters, and "enemies" or "mobs" for the ones you fight.

## Why NPCs matter in games

NPCs do a lot of quiet work. A good NPC can:

- **Tell the story.** Characters deliver the plot far better than text on a loading screen.
- **Guide the player.** A helpful character can explain a mechanic at the exact moment it's needed.
- **Make the world believable.** A town with people walking, talking and working feels real. An empty one feels like a set.
- **Create challenge.** Enemies and rivals give players something to overcome.
- **Create emotion.** Players remember companions they cared about long after they forget the mechanics.

## The main types of NPCs

{{img:types|Most NPCs fall into one of these six roles.}}

### Quest givers

Quest givers offer missions and rewards. They're often marked with an icon above their heads so players can spot them from a distance. Good quest givers have a reason to need help, which makes the task feel meaningful instead of like a chore list.

### Merchants and service NPCs

Shopkeepers, blacksmiths and trainers let players buy, sell, upgrade or learn. They're the backbone of an in-game economy, so their prices and stock shape how players progress.

### Companions

Companions travel with the player, help in fights or solve puzzles together. They're some of the hardest NPCs to build well: a companion who blocks doorways or runs into traps quickly becomes annoying. Great companions stay out of the way, react to what's happening and have personality.

### Enemies and bosses

Enemies exist to challenge the player. Interestingly, great enemy AI is usually about being **readable** rather than smart. Players need to see an attack coming so they can react, and a perfectly aimed shot every time isn't fun.

### Ambient NPCs

Crowds, villagers, animals and passers-by make a world feel inhabited. They often have very simple behavior, like walking a route, sitting on a bench or reacting when the player runs past, but together they have a big effect.

### Tutorial and guide NPCs

These characters teach the player how to play. A friendly guide who says "try jumping over that gap" feels much more natural than a pop-up full of instructions.

## How NPC AI works

NPC "intelligence" in most games isn't the same as modern machine learning. It's usually a set of carefully designed rules that make characters look smart. These are the most common approaches.

### Finite state machines

The simplest and most common approach. The NPC is always in one **state**, like *Patrol*, *Chase* or *Attack*, and specific events switch it to another state.

{{img:state-machine|A classic guard NPC, built as a simple state machine.}}

Here's what a guard's logic might look like in simple pseudo-code:

\`\`\`text
every frame:
  if state == PATROL and canSee(player):      state = CHASE
  if state == CHASE  and distanceTo(player) < 2: state = ATTACK
  if state == CHASE  and lostSightFor(5 seconds): state = RETURN
  if state == ATTACK and distanceTo(player) > 2: state = CHASE
  if state == RETURN and atHome():            state = PATROL
\`\`\`

State machines are easy to understand and debug, which is why they're perfect for your first game. Their weakness is that they get tangled when an NPC has many states and connections.

### Behavior trees

A behavior tree organizes decisions as a tree of tasks. The NPC checks branches in priority order: *Am I badly hurt? Then find cover. Can I see the player? Then attack. Otherwise, patrol.* Behavior trees are popular in commercial games because designers can add new behaviors without rewriting everything, and engines like Unreal Engine include a behavior tree editor out of the box.

### Utility AI

With utility AI, the NPC gives every possible action a score based on the situation, like hunger, danger or distance, and picks the highest one. It's great for characters that juggle many needs, which is why it's common in life simulation and survival games.

### Goal-oriented action planning (GOAP)

GOAP lets an NPC plan a sequence of actions to reach a goal, like *get weapon → move to cover → attack*. It became famous through the enemy AI in *F.E.A.R.* (2005), whose soldiers seemed to flank and coordinate. It's powerful but more complex to build.

{{img:ai-techniques|The main NPC AI techniques compared.}}

### Pathfinding: how NPCs get around

Whatever decides *what* an NPC does, it also needs to know *how to get there*. Most games use a **navigation mesh (navmesh)**, a map of walkable surfaces, and a search algorithm such as **A\\*** (A-star) to find the shortest path around obstacles. Engines like Unity, Unreal and Godot all include navigation tools, so you rarely have to write this yourself.

## NPCs and generative AI

A newer trend is NPCs powered by large language models, which can hold open conversations instead of choosing from pre-written dialogue. It's an exciting area, but it brings real design challenges: keeping characters on-topic and in-character, controlling cost and speed, and making sure the story still works. For now, most shipped games still rely on written dialogue, sometimes combined with AI for smaller moments.

If you're curious how AI can help you build games, not only characters, read our guide on [how to make a game with AI](/posts/how-to-make-a-game-with-ai).

## How to design memorable NPCs

1. **Give every NPC one clear job.** Players should instantly understand why a character is there.
2. **Give them a want.** A merchant saving up for a ship is more interesting than a merchant who just sells things.
3. **Make behavior readable.** Use animations, sounds and icons so players understand what an NPC is doing and about to do.
4. **React to the player.** Even small reactions, like a villager commenting on your new armor, make the world feel alive.
5. **Keep dialogue short.** Say one interesting thing, then let players get back to playing.
6. **Test with real players.** You know what your NPC is supposed to do. Players don't. Our [game testing guide](/posts/game-testing) shows how to watch for confusion.

Writing all this down before you build saves a lot of rework. A [game design document](/posts/game-design-document-template) is a good place to describe each NPC's role, behavior and dialogue.

## Why do people call someone an "NPC"?

Outside of games, "NPC" became internet slang for someone who seems to repeat the same opinions or behave on autopilot, like a background character following a script. In games, though, the word is simply a technical term, and many NPCs are the most beloved characters in their worlds.

## FAQ

### What is an NPC in simple terms?

An NPC, or non-player character, is any character in a game that isn't controlled by a real player. The game controls it using rules or AI.

### What is an example of an NPC?

A shopkeeper who sells items, a villager who gives you a quest, a companion who follows you, or a guard who chases you are all NPCs.

### Are NPCs controlled by AI?

Yes, but usually by game AI, meaning hand-designed rules like state machines and behavior trees, rather than machine learning. Some newer games experiment with generative AI for dialogue.

### What is the opposite of an NPC?

A player character (PC): a character controlled by a real person.

### How do I make an NPC for my own game?

Start with a simple state machine: decide the states (like idle, talk and walk), what triggers each change, and add animations so players can read what's happening. Most game engines include tools to help, and you can try the idea quickly on [Pixelfork](https://pixelfork.ai).
`,
};

export default post;
