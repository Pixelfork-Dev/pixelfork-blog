import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame, table } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "google-play-closed-testing-ai-games",
  title: "Google Play Closed Testing: 12 Testers, 14 Days",
  excerpt:
    "New personal Play accounts need a closed test with 12 testers for 14 days before production. Here's how to run it for an AI-built game, and how to find the testers.",
  seoTitle: "Google Play Closed Testing: 12 Testers, 14 Days Explained",
  seoDescription:
    "How Google Play closed testing works for indie and AI-built games: the 12 testers and 14 days rule, the full checklist, and how to recruit real testers.",
  focusKeyword: "google play closed testing",
  tags: ["distribution", "mobile-game-dev", "pro-tips"],
  cover: { file: "cover.webp", alt: "Graphic of a release checklist moving through testing stages before launch" },
  graphics: {
    tracks: {
      alt: "Google Play testing tracks compared: internal testing, closed testing, open testing and production",
      svg: frame(
        "Play testing tracks at a glance",
        "Requirements and labels change — check Play Console Help before you plan a date.",
        table(
          ["Track", "Who plays", "Typical use"],
          [
            ["Internal testing", "A small internal list", "Fast builds for your own devices"],
            ["Closed testing", "Testers you invite", "The gate before production for new personal accounts"],
            ["Open testing", "Anyone who opts in", "Public beta and wider feedback"],
            ["Production", "Everyone on Play", "The live listing"],
          ],
          { firstWidth: 380, rowHeight: 96 },
        ),
        "Google Play Console Help",
      ),
    },
    checklist: {
      alt: "Seven step checklist from building the game to applying for production access on Google Play",
      svg: frame(
        "Closed testing, end to end",
        "The steps are the same whether the game was built by hand or with AI.",
        flow([
          { title: "Build & test", note: "APK on a real phone first" },
          { title: "Create the app", note: "Play Console listing details" },
          { title: "Upload AAB", note: "Closed testing release" },
          { title: "Invite testers", note: "12+ opted in, continuously" },
          { title: "Wait 14 days", note: "Collect crashes and feedback" },
          { title: "Apply", note: "Request production access" },
        ]),
      ),
    },
    mistakes: {
      alt: "Four common mistakes that delay Google Play approval for AI-built games",
      svg: frame(
        "What actually delays indie releases",
        "None of these are about how the game was made.",
        cards([
          { name: "Missing policy answers", note: "Data safety, content rating, target audience and a reachable privacy policy." },
          { name: "First launch fails", note: "It ran in your browser, but crashed on a mid-range Android device.", accent: C.teal },
          { name: "Listing mismatch", note: "Screenshots and description don't match what the build actually does.", accent: C.green },
          { name: "Testers who never play", note: "Opt-ins count, but silent testers give you nothing to fix.", accent: C.yellow },
        ]),
      ),
    },
  },
  body: `
You built a game, exported a build, opened the Play Console — and hit a wall: production is locked until you run a closed test. **Google Play closed testing** with "12 testers for 14 days" is the gate most new indie publishers meet, and it applies no matter how the game was made.

This guide explains the rule in Google's own terms, gives you a checklist that works for an AI-built Android game, and covers the part everyone struggles with: finding twelve real testers.

## Why closed testing shows up before you can go live

Play Console offers several testing tracks that let you widen your audience gradually.

{{img:tracks|Testing tracks, from your own devices to the public listing.}}

Testing tracks are about quality and policy, not about your toolchain. Unity, Godot, a hand-written engine or an [AI game maker](/posts/ai-game-maker-export-apk-aab-google-play) — the process is identical, and the AAB you upload is just a file.

## The "12 testers, 14 days" rule, accurately

Here's the current wording from Play Console Help: Google requires **personal developer accounts created after 13 November 2023** to run a **closed test with a minimum of 12 testers who have been opted in continuously for at least 14 days**. Once you meet that bar, you can apply for production access from the Play Console dashboard, answering questions about your app's design, your testing process and production readiness ([App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465)).

Three things worth underlining:

- **It applies to personal accounts**, created after that date. Organisation accounts follow a different path.
- **"Continuously opted in" is the tricky part.** If testers leave the program, your window can restart. Ask people to stay opted in until you tell them you're done.
- **Policies change.** Treat every number in this article as "true at the time of writing" and confirm on Google's page before you plan a launch date.

An AI-built game gets no shortcut here, and no penalty either. Google reviews what the app does, not how you made it.

## End-to-end checklist for an AI-built game

{{img:checklist|The sequence that avoids wasted Console releases.}}

1. **Build for Mobile / Tablet and get the loop right.** Fix feel before packaging; every rebuild after upload costs you time.
2. **Export an APK and test on real hardware.** Borrow an older phone if you can. This is where first-launch crashes, tiny touch targets and unreadable text show up.
3. **Export an AAB** ([APK vs AAB](/posts/apk-vs-aab-for-indie-games) if you're unsure which is which).
4. **Create the app in Play Console** and complete the store listing: title, short and full description, screenshots, feature graphic, icon, category, contact details and a privacy policy URL.
5. **Answer the policy questionnaires**: content rating, target audience and content, data safety, ads declaration, government-apps and news declarations where relevant.
6. **Create a closed testing release**, upload the AAB, add release notes, and set up your tester list (email list or Google Group).
7. **Share the opt-in link**, keep at least 12 testers opted in for 14 continuous days, then **apply for production access**.

## How to recruit 12 real testers without an audience

This is the part that blocks most solo developers. Some approaches that work:

- **Friends and family with Android phones.** Twelve is fewer than it sounds — ask 20 people to be safe.
- **Indie and game-dev communities.** Discord servers, subreddits and forums often have tester-swap threads: you test someone's game, they test yours.
- **Your own players.** If you already shared a [playable web link](/posts/playable-link-custom-domain-landing-page), the people who replied with feedback are your warmest testers.
- **Local meetups, classmates, colleagues.** In person, an opt-in link and a QR code take thirty seconds.

Make it easy: send the opt-in link, a one-line install instruction, and exactly three questions ("Did it launch? What confused you in the first minute? Did anything look broken?"). Set expectations that the test runs two weeks and they should stay opted in until then.

## What AI-built games get wrong in testing

{{img:mistakes|The usual suspects behind a rejected or delayed release.}}

Two more worth calling out:

- **Placeholder content.** Generated art or sound you don't have rights to, or "TODO" text left in a menu, is exactly the kind of thing a reviewer notices.
- **Permissions you don't need.** If your build requests something the game doesn't use, remove it before you submit — it makes the data-safety form harder and reviewers more suspicious.

## Tips if you're publishing from Pixelfork

- **Do device QA with the APK first.** Uploading a broken build to a closed track wastes days of your 14-day window.
- **Use the AAB for the track upload.** That's the format the Console expects.
- **Export the Android Studio project if you need policy-sensitive pieces**, such as an ads consent flow or in-app purchases, before you go to production.
- **Keep the playable link as your feedback channel.** It costs nothing to publish, works in any browser, and republishing keeps the same URL.

## FAQ

### Do AI-generated games skip Google Play testing requirements?

No. Google's testing requirements apply to the developer account and the app, not to the tools you used. An AI-built game goes through the same closed testing, policy questionnaires and review as any other Android game.

### What counts as a closed tester?

Someone you invited to the closed track — by email list or Google Group — who has opted in through the link you shared and stays opted in. Google's requirement for new personal accounts is at least 12 such testers, continuously opted in for 14 days.

### Can I use the same AAB for closed testing and production?

Yes. A bundle promoted from a testing track to production is the same build. If you make changes, upload a new bundle with a higher version code.

### Should testers install a sideloaded APK or use the Play testing link?

For Google's requirement, they need to be opted-in testers installing through Play. Sideloaded APKs are great for quick feedback rounds, but they don't count toward the closed-testing criteria.

### What if I can't find 12 testers?

Ask in indie communities that run tester exchanges, and over-invite — some people never opt in. Until you reach the bar, use open channels such as a web playable to collect feedback and keep improving the game.

### Does Pixelfork submit my game to Google Play for me?

No. Pixelfork produces the APK and AAB; creating the app, completing the listing, answering policy questions, running the test and applying for production are all done by you in Play Console.

Get the build right before Console day: [make your game on Pixelfork](https://pixelfork.ai), export an APK for device QA, then upload the AAB to a closed track.
`,
};

export default post;
