import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "add-ads-and-iap-after-android-studio-export",
  title: "Add Ads and IAP After an Android Studio Export",
  excerpt:
    "You exported the full Android project — now what? A realistic map of adding AdMob and in-app purchases to an AI-built game, and what work is actually left.",
  seoTitle: "Add Ads and IAP After an Android Studio Export",
  seoDescription:
    "How to add AdMob ads and in-app purchases to an AI-built Android game after exporting the full Android Studio project, including what to do before you start.",
  focusKeyword: "android studio export ads iap",
  tags: ["monetization", "mobile-game-dev", "distribution"],
  cover: { file: "cover.webp", alt: "Flat vector illustration of a mobile game connected to ad and purchase building blocks" },
  graphics: {
    boundary: {
      alt: "What the web editor handles versus what the native Android project is for",
      svg: frame(
        "Where the editor stops and Android begins",
        "Knowing the boundary saves you a week of looking for a button that doesn't exist.",
        table(
          ["Job", "Where it happens"],
          [
            ["Generate and iterate the game", "AI editor (chat and mechanics panel)"],
            ["Playable web link, custom domain", "AI editor"],
            ["APK for testing, AAB for Play", "AI editor export"],
            ["AdMob or another ad SDK", "Android Studio project"],
            ["In-app purchases (Play Billing)", "Android Studio project"],
            ["Play Games Services, push, analytics", "Android Studio project"],
          ],
          { firstWidth: 520, rowHeight: 74 },
        ),
      ),
    },
    "ad-formats": {
      alt: "Ad formats compared: banner, interstitial and rewarded, with where each fits in a session",
      svg: frame(
        "Which ad format fits where",
        "Placement matters more than format.",
        cards([
          { name: "Rewarded", note: "Opt-in, for a continue, a bonus or a skin. Highest value per view and the least resented." },
          { name: "Interstitial", note: "Full screen at a natural break — never mid-run, never in the first minute.", accent: C.teal },
          { name: "Banner", note: "Persistent and low value. On small screens it often costs more in feel than it earns.", accent: C.green },
          { name: "None (yet)", note: "A perfectly good choice while you're still finding out whether the loop is fun.", accent: C.yellow },
        ]),
      ),
    },
    order: {
      alt: "Recommended order of work: freeze gameplay, export project, verify a debug build, add one SDK, test, then release",
      svg: frame(
        "Do it in this order",
        "Adding SDKs while gameplay is still changing is how projects get stuck.",
        flow([
          { title: "Freeze gameplay", note: "Loop and feel settled" },
          { title: "Export project", note: "Full Android Studio project" },
          { title: "Debug build", note: "Runs on a device first" },
          { title: "Add one SDK", note: "Ads or billing, not both" },
          { title: "Test", note: "Test ads, licence testers" },
          { title: "Release", note: "AAB from Android Studio" },
        ]),
      ),
    },
  },
  body: `
An AI editor gets you to a playable game quickly. Then you want money, and you hit a wall: there's no "add AdMob" button in a web editor, because ads and in-app purchases are **native Android integrations**. They live in an Android project.

That's exactly what the **Android Studio project export** is for. This guide maps the handoff: what you get, what's left to do, and the order that avoids a painful week.

{{img:boundary|The boundary, drawn clearly.}}

## What the export gives you

Per the [Android Studio project export docs](https://docs.pixelfork.ai/docs/aab-export), you get the full underlying project rather than a finished file: the game's source, its assets and the Android project configuration, ready to open in Android Studio. From there you can add in-app purchases, ads such as AdMob, Play Games Services and any other native SDK.

What it is **not**: a one-click monetisation switch. Nothing is pre-wired, and that's the honest trade — you get a real Android project, and real Android projects need real integration work.

## Before you add a single SDK

1. **Freeze gameplay.** Every change you make in the AI editor after this point has to be re-exported and re-merged. Get the loop right first — the [game-feel workflow](/posts/tune-game-feel-mechanics-editor) is the cheap place to do that.
2. **Open the project and build it.** Run a debug build on a real device before touching anything. If the untouched project runs, later breakage is yours to fix; if it doesn't, fix that first.
3. **Check the basics.** Package name (you can't change it after publishing), app name, icons, version code and version name.
4. **Decide the model.** Rewarded ads only? Interstitials at level end? A single "remove ads" purchase? Decide before you integrate, because the placement shapes the code.

{{img:order|Six steps. Skipping step one is the classic mistake.}}

## Adding ads, realistically

{{img:ad-formats|Formats, and where each one belongs.}}

The shape of the work with AdMob:

1. **Create an AdMob account and app**, then create ad units for the formats you'll use.
2. **Add the SDK** to the Android project through Gradle and set your app ID in the manifest. Follow [Google's AdMob Android quick start](https://developers.google.com/admob/android/quick-start) rather than a blog snippet — the setup details change, and stale Gradle instructions are the number one cause of wasted evenings.
3. **Load and show ads at natural breaks.** Preload while the player is busy; show at the end of a run or level.
4. **Always test with Google's test ads** during development. Clicking your own live ads is a fast way to get an account suspended.
5. **Handle consent and privacy.** You'll need a consent flow for users in regions that require it, and your Play data-safety answers must match what the SDK collects.

Design rules worth keeping: don't interrupt the first minute, never show a full-screen ad mid-run, and cap frequency. If you're deciding formats and placement in more depth, our [monetisation strategies](/posts/monetization-strategies-for-indie-mobile-games) and [ad mediation](/posts/ad-mediation-explained) articles cover the trade-offs.

## Adding in-app purchases, realistically

1. **Set up products in Play Console** — a one-time "remove ads" unlock, a consumable currency pack, or both.
2. **Integrate the Play Billing Library** in the Android project, following [Google's billing documentation](https://developer.android.com/google/play/billing).
3. **Decide consumable vs non-consumable** carefully. Currency is consumable; "remove ads" and permanent unlocks are not, and non-consumables must be restorable when a player reinstalls.
4. **Verify purchases properly** and grant the item only after Play confirms. Never hand out a paid item on a button press alone.
5. **Test with licence testers** in Play Console before you ship.

A "remove ads" purchase is the friendliest first product: it's simple to implement, easy to explain, and it rewards the players who like your game most.

## Other native additions worth knowing

- **Play Games Services** for leaderboards, achievements and cloud saves — good retention hooks for arcade and hypercasual games.
- **Analytics and crash reporting.** Even a basic setup tells you where players stop playing.
- **Push notifications.** Useful, easy to overuse; save them for real events.

## How to split the work

- **Solo, non-coder:** hire a freelancer for a few hours of SDK wiring once the game is finished. Hand over a working project, a written list of ad placements and the products you want — that's a well-defined job, not an open-ended one.
- **Developer-founder:** do it yourself with the official codelabs, and keep gameplay frozen while you integrate so you can tell which change broke what.

Either way, keep the AI editor as the place gameplay changes happen, and the Android project as the place production plumbing happens. Mixing the two is where projects get lost.

## FAQ

### Can I add AdMob without leaving the web editor?

No. Ad SDKs are native Android integrations, so they're added in the exported Android Studio project. The web editor's job ends at generating the game and packaging APK, AAB and the project itself.

### Do I need to know Kotlin or Java?

Some. Following official quick starts gets you a long way, but you'll be editing Gradle files and Android code. Many solo creators hire a few freelancer hours for this step instead.

### Will adding ads break my AAB export from the editor?

The editor's export doesn't know about changes you make in Android Studio. Once you've added native SDKs, build your APK and AAB from Android Studio — that project becomes your source of truth for releases.

### What's the difference between exporting an AAB and exporting the Studio project?

The AAB is a finished bundle you can upload to Play as-is. The Studio project is the full source project you extend with native features and then build your own AAB from.

### Can I do in-app purchases on the playable web link?

No. Play Billing is an Android feature. The web playable is for demos, feedback and marketing — see [using a playable link as a landing page](/posts/playable-link-custom-domain-landing-page).

### Is Play Games Services required to publish?

No. It's optional. Leaderboards and achievements can help retention in arcade games, but plenty of successful titles ship without them.

Get the gameplay right first, then hand it over: [build and export your game on Pixelfork](https://pixelfork.ai), and wire monetisation in the Android project when the loop is worth monetising.
`,
};

export default post;
