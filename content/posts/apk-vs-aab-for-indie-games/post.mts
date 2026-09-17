import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "apk-vs-aab-for-indie-games",
  title: "APK vs AAB for Indie Games: Which Build Do You Need?",
  excerpt:
    "APK installs on a phone; AAB is what Google Play expects. Here's the plain-English difference, a decision table and the indie workflow that uses both in the right order.",
  seoTitle: "APK vs AAB for Indie Games: Which Build Do You Need?",
  seoDescription:
    "APK vs AAB explained for indie and AI-built games: what each format does, which one Google Play accepts, and when you need a full Android Studio project instead.",
  focusKeyword: "apk vs aab",
  tags: ["distribution", "mobile-game-dev"],
  cover: { file: "cover.webp", alt: "Graphic comparing an installable Android package with a store bundle" },
  graphics: {
    decision: {
      alt: "Decision table showing when to use an APK, an AAB or an Android Studio project",
      svg: frame(
        "Which file do you need?",
        "Pick by the job you're doing right now.",
        table(
          ["Goal", "Use", "Why"],
          [
            ["Test on your own phone", "APK", "Installs directly, no store involved"],
            ["Send a build to a few testers", "APK", "They can install it from a file"],
            ["Submit or update on Google Play", "AAB", "The bundle format Play requires"],
            ["Add ads, IAP or native SDKs", "Studio project", "Build APK/AAB from Android Studio after"],
          ],
          { firstWidth: 460, rowHeight: 100 },
        ),
      ),
    },
    differences: {
      alt: "Side-by-side comparison of APK and AAB covering installation, Play submission, file contents and typical use",
      svg: frame(
        "APK and AAB side by side",
        "Two formats, two jobs — not two versions of the same thing.",
        table(
          ["", "APK", "AAB"],
          [
            ["Installs on a device", "Yes", "No"],
            ["Accepted by Play Console", "No (new apps)", "Yes"],
            ["Who builds the final file", "You do", "Google Play does"],
            ["Typical use", "Testing and sharing", "Publishing and updates"],
            ["Sent over chat or email", "Works", "Testers can't install it"],
          ],
          { firstWidth: 340, rowHeight: 92 },
        ),
        "Android developer documentation · Pixelfork export docs",
      ),
    },
    workflow: {
      alt: "Indie release workflow: prototype, APK device test, closed testing with an AAB, then production release",
      svg: frame(
        "The order that saves you time",
        "Each step catches problems the next step would make expensive.",
        flow([
          { title: "Prototype", note: "Playable in the browser" },
          { title: "APK", note: "Real phone, real thumbs" },
          { title: "AAB → closed test", note: "Upload to Play Console" },
          { title: "Production", note: "Same bundle, wider release" },
        ]),
      ),
    },
    myths: {
      alt: "Three common myths about APK and AAB files and the reality behind each",
      svg: frame(
        "Three myths that waste an afternoon",
        "All three come up in indie Discords every week.",
        cards([
          { name: "“I'll email testers the AAB”", note: "They can't install it. Send an APK, or invite them to a Play testing track." },
          { name: "“APKs are banned now”", note: "Play requires AAB for new app submissions. APKs are still fine for testing and off-store sharing.", accent: C.teal },
          { name: "“One file does everything”", note: "Testing, publishing and native SDK work each want a different artifact.", accent: C.green },
        ], 3),
      ),
    },
  },
  body: `
If you've just found an Export menu with two Android options, the question is simple: **APK vs AAB** — which one do you actually need? The short answer: an APK is for testing on devices, and an AAB is what you upload to Google Play.

This guide keeps it practical. No Gradle lecture, just the difference, a decision table and the order to do things in — whether your game came out of Unity, Godot or an [AI game maker with Android export](/posts/ai-game-maker-export-apk-aab-google-play).

## Plain-English definitions

**APK (Android Package Kit)** is an installable Android app file. Put it on a phone, open it, and Android installs it. Because it's not coming from the Play Store, the device will ask you to allow installs from unknown sources — normal, and reversible.

**AAB (Android App Bundle)** is a publishing format. It contains everything your app needs for every device configuration, and Google Play uses it to generate and sign the specific APK each device downloads. Google requires the bundle format for new apps on Play; see the [App Bundle documentation](https://developer.android.com/guide/app-bundle).

The mental model that clears up most confusion: **you build an AAB for Google; Google builds the APKs for players.**

{{img:differences|The practical differences between the two formats.}}

## The decision table

{{img:decision|Pick the artifact that matches the job.}}

## Three myths that waste an afternoon

{{img:myths|If you've hit one of these, you're in good company.}}

A fourth one worth naming: "my test APK is basically published." It isn't. A sideloaded APK doesn't appear on Play, doesn't get updates, and doesn't count toward Google's testing requirements for new personal developer accounts — that needs a real testing track, which we cover in [Google Play closed testing for AI-built games](/posts/google-play-closed-testing-ai-games).

## How export works in Pixelfork

In the editor, click **Export** and choose the format. Both APK and AAB ask for the same two things before packaging:

- **App name** — what players see under the icon.
- **App icon** — PNG or JPG, square, at least 512×512 pixels.

Pixelfork then builds the file and downloads it. Transfer the APK to your phone to install it; take the AAB to the Play Console and attach it to a release. The details are in the [APK and AAB export docs](https://docs.pixelfork.ai/docs/export-as-apk-aab).

One note specific to AI-built games: the platform choice (Desktop or Mobile / Tablet) is made when the game is created and can't be changed afterwards, so start a game you intend to ship on Android as a Mobile / Tablet project.

## Where the Android Studio project fits

Some things simply don't live in a web editor: ad SDKs, in-app purchases through Play Billing, Play Games Services, push notifications. For those, export the **full Android Studio project**, add the SDK there, and build your APK and AAB from Android Studio. That handoff is its own article: [adding ads and IAP after an Android Studio export](/posts/add-ads-and-iap-after-android-studio-export).

## The practical indie workflow

{{img:workflow|Prototype, test, then publish — in that order.}}

1. **Prototype in the browser.** Fast iteration, no packaging.
2. **Export an APK and install it on a real phone.** Check touch targets, frame rate on a mid-range device, first-launch experience, and whether the game is readable in sunlight.
3. **Fix what the device revealed.** This is where most of the value is. Small [performance work](/posts/optimize-mobile-game-performance) pays off more than new features.
4. **Export an AAB** and upload it to a closed testing track in Play Console.
5. **Promote the same bundle to production** when you're eligible and the feedback is good.

Keep the app name and icon consistent across builds, and bump your version for each upload — Play rejects a bundle whose version code it has already seen.

## Signing, in plain language

Every Android app is signed with a cryptographic key, and Android uses that signature to decide whether an update really comes from you. Two practical rules follow:

1. **Keep your keys safe and backed up.** If you lose the key for an app published outside Play, you cannot ship updates to existing installs.
2. **On Play, use Play App Signing.** Google holds the app signing key and you keep an upload key; if the upload key is lost, support can help you reset it. That safety net is the main reason it exists.

For test builds you send to friends, the signature doesn't matter much — Android will simply warn about an unknown source. For anything on the store, it matters permanently.

## Version codes and updates

Two fields travel with every build:

- **Version code** — an integer Play uses to order releases. Every upload needs a higher number than the last, or Play rejects it.
- **Version name** — the human-readable string ("1.0.3") players see.

A simple habit that avoids confusion: bump the version code for every single build you upload anywhere, even the ones that never reach production, and keep the version name for changes players would notice.

## A sideloading checklist for testers

When you send an APK to testers, send these five lines with it:

1. Download the file on the Android phone itself (not on a desktop and then AirDropped — that's where most confusion starts).
2. Open it from the notification or the Files app.
3. If Android warns about unknown sources, allow installs for the app you downloaded it with.
4. Play for a few minutes, including a restart of the app.
5. Reply with: did it launch, did anything look wrong, and did it ever feel slow?

That's the whole protocol. Testers who get a wall of instructions usually don't test.

## What to actually test on device

The point of an APK isn't to prove the game exists — it's to find what the browser hid:

- **First launch.** Cold start on a mid-range phone, with no cache.
- **Touch accuracy.** Are the buttons and pieces big enough for a thumb?
- **Frame rate under load.** The busiest moment, not the menu.
- **Screen shapes.** Notches, rounded corners and tall aspect ratios clipping UI.
- **Interruptions.** A phone call or backgrounding the app, then returning — does it resume or restart?
- **Battery and heat** over a ten-minute session, if your game runs 3D continuously.

Each of those has fixes that are cheap now and expensive after launch. Our [mobile performance checklist](/posts/optimize-mobile-game-performance) covers the ones that need code.

## What about distributing outside Google Play?

Play isn't the only Android channel, and APKs matter more here:

- **itch.io** accepts APK uploads, which makes it a natural home for jam builds and demos — see [publishing on itch.io and Steam](/posts/publish-your-game-on-itch-io-and-steam).
- **Direct downloads** from your own site work, as long as you tell players about the unknown-sources prompt.
- **Other Android stores** have their own formats and rules; check each one before assuming your Play bundle transfers.

In all of those cases, you're responsible for signing and for hosting updates — there's no Play Console doing it for you.

## FAQ

### Can I publish an APK to Google Play?

Not for a new app. Google Play requires the Android App Bundle for new app submissions, and generates the device-specific APKs itself. APKs remain useful for testing and for distribution outside Play.

### Why can't my friends install the AAB I sent them?

Because an AAB isn't an installable app — it's a bundle for Google Play to process. Send them an APK instead, or add them to a Play testing track so they install through the Play Store.

### Do I need a different icon for APK and AAB?

No. Both exports ask for the same app name and icon (PNG or JPG, square, at least 512×512). Using the same assets keeps your test builds and store listing consistent.

### Should I always export the Android Studio project?

No. Only when you need native integrations — ads, in-app purchases, Play Games Services, analytics SDKs. If your game is a straightforward premium or free release without those, the AAB export is enough.

### Is the AAB format only for big studios?

No. It's the standard submission format for everyone on Play, from solo developers to large studios. The tooling does the heavy lifting; you upload one file.

### Which format should I use for a game jam or an itch.io release?

APK. Distribution outside Google Play doesn't use bundles, and players can download and install an APK directly — the same way many [itch.io releases](/posts/publish-your-game-on-itch-io-and-steam) ship.

Export an APK today to see how your game really feels on a phone, then switch to AAB when you open the Play Console. [Build your game on Pixelfork](https://pixelfork.ai).
`,
};

export default post;
