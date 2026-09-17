import type { PostPackage } from "../types.ts";
import { C, cards, flow, frame } from "../../../scripts/lib/graphics.mts";

const post: PostPackage = {
  slug: "playable-link-custom-domain-landing-page",
  title: "Use a Playable Link as Your Play Store Landing Page",
  excerpt:
    "A web playable turns “download and see” into “try it now”. Here's how to publish one, put it on your own domain, and use it as the top of your Play Store funnel.",
  seoTitle: "Playable Link + Custom Domain as a Play Store Landing Page",
  seoDescription:
    "Publish a playable web demo, connect a custom domain, and use it as the landing page that drives installs to your Google Play listing. Setup and funnel tips.",
  focusKeyword: "playable game landing page",
  tags: ["distribution", "mobile-game-dev", "pro-tips"],
  cover: { file: "cover.webp", alt: "Graphic of a web demo linking players onward to an app store listing" },
  screenshots: {
    "domain-panel": {
      file: "custom-domain-panel.webp",
      alt: "The Pixelfork publish panel showing the playable link, an Update button and the custom domain setup instructions with the A record value",
      credit: "Screenshot: Pixelfork publish panel.",
    },
  },
  graphics: {
    funnel: {
      alt: "Funnel from an ad or social post to a playable web demo, then to a Play Store listing and install",
      svg: frame(
        "Try-then-install beats download-and-hope",
        "Every step you remove before the fun is a step people don't drop out of.",
        flow([
          { title: "Ad or post", note: "Discord, X, Reddit, TikTok" },
          { title: "Playable link", note: "Instant browser play, no install" },
          { title: "Store button", note: "“Get it on Google Play”" },
          { title: "Install", note: "Players who already liked it" },
        ]),
      ),
    },
    "web-vs-store": {
      alt: "Comparison of what a web playable is good for versus what the Play Store listing is for",
      svg: frame(
        "Two channels, two jobs",
        "Neither replaces the other.",
        cards([
          { name: "Web playable", note: "Feedback, marketing, investor demos, community sharing. No install, works on desktop and mobile browsers." },
          { name: "Play listing", note: "Discovery in the store, installs, ratings, updates, in-app purchases and ads.", accent: C.teal },
          { name: "Closed testing track", note: "Official testers and the production-access requirement for new personal accounts.", accent: C.green },
          { name: "APK build", note: "Device QA and quick shares with a handful of testers.", accent: C.yellow },
        ]),
      ),
    },
    page: {
      alt: "Anatomy of a minimal landing page: playable game, one-line pitch, store button and a short feedback link",
      svg: frame(
        "A landing page that takes an afternoon",
        "Four elements. Resist adding a fifth.",
        cards([
          { name: "The game", note: "Full-screen or embedded, playable in one tap — no sign-up wall." },
          { name: "One-line pitch", note: "What it is and why it's fun, in plain words.", accent: C.teal },
          { name: "Store button", note: "“Get it on Google Play”, with a UTM so you can see what worked.", accent: C.green },
          { name: "Feedback link", note: "A Discord invite or a three-question form.", accent: C.yellow },
        ]),
      ),
    },
  },
  body: `
Asking someone to install a 60 MB app from a stranger is a big ask. Asking them to tap a link and play for thirty seconds isn't. That's the whole argument for a **playable game landing page**: let people try the game in a browser, then send the ones who enjoyed it to your store listing.

This guide covers publishing a playable link, putting it on a domain you own, and wiring it into a simple funnel that ends at Google Play.

## Why a playable landing page helps indies

{{img:funnel|The web demo does the convincing; the store does the installing.}}

- **Ads and social posts convert better** when the click leads to play, not to a store page and a download bar.
- **Feedback arrives faster.** Testers don't need an APK, an opt-in link or a Play account — they tap and tell you what felt off.
- **Investor and publisher demos stop being a scheduling problem.** Send a URL that works on their phone.
- **Community channels love a link.** Discord, Reddit and X threads reward things people can try immediately.

{{img:web-vs-store|What each channel is actually for.}}

## Publishing the playable link

In Pixelfork, hit **Publish** in the top-right of the editor. You get a public URL at \`pixelfork.ai/publish/…\` that anyone can open and play instantly — no account, no download, on desktop and mobile browsers alike. Publishing doesn't consume credits.

The important detail for marketing: **republishing keeps the same URL.** Ship a change, hit Publish again, and everyone who already has the link sees the new version. You can print that link on a sticker without regretting it next week.

## Connecting a custom domain

On the Pro plan you can serve the game from a domain you own, which makes it feel like a product rather than a project.

{{img:domain-panel|The publish panel with the custom domain setup and its A record value.}}

The setup, from the [custom domain docs](https://docs.pixelfork.ai/docs/custom-domain-setup):

1. Go to your domain registrar or DNS provider (Cloudflare, Namecheap, GoDaddy and so on).
2. Add an **A record**:
   - For the root domain — **Host:** \`@\`, **Value:** \`76.76.21.21\`
   - For a subdomain — **Host:** \`game\` (or whatever you like), **Value:** \`76.76.21.21\`
3. Save, then return to the editor and verify the connection.

DNS changes can take a few minutes to 24 hours to propagate. If verification fails immediately, wait and try again rather than changing the record repeatedly.

A subdomain is usually the smarter choice: \`game.yourstudio.com\` keeps your main site free for everything else, and you can point more subdomains at future titles.

## Anatomy of a minimal landing page

{{img:page|Four elements, no more.}}

Resist the urge to build a marketing site. The playable *is* the marketing. If you want the store button to sit next to the game rather than on a separate page, put the game full-screen on your domain and keep the store link in the game's own menu or game-over screen — players see it right after the moment they enjoyed themselves.

Add a UTM parameter to the Play link (\`?utm_source=web-demo\`) so your Play Console acquisition reports can tell you how much the demo contributed.

## Keeping the web demo and the store build aligned

- **Same core loop, same look.** If the demo teaches one control scheme and the app uses another, you've trained players wrong.
- **Expect some differences.** Native features added after an [Android Studio export](/posts/add-ads-and-iap-after-android-studio-export) — ads, in-app purchases, push — only exist in the Android build. Keep the web demo free of anything that implies them.
- **Republish when the game meaningfully changes.** A stale demo is worse than no demo.
- **Mention the platform.** If the store build is Android-only for now, say so on the page. iPhone users tapping a Play link is a bad first impression.

## Using it alongside Play Console

The web playable is your open feedback channel; the Play testing tracks are the official ones. During [closed testing](/posts/google-play-closed-testing-ai-games), the link is a great way to attract people who might become testers — but the 12-tester, 14-day requirement counts opted-in testers on the track, not web players.

When you're live, the funnel is simply: post → play → install.

## FAQ

### Can players play without installing anything?

Yes. A published playable link opens in a normal browser on desktop or mobile — no account, no download, no install. That's what makes it good at the top of a funnel.

### Does the link change every time I publish?

No. Republishing updates the game at the same URL, so links you've already shared keep working and always show the latest version.

### What plan do I need for a custom domain?

Custom domains are a Pro feature. The playable link itself is available without one, at a \`pixelfork.ai/publish/…\` URL.

### Can I put the playable link inside my Play Store listing?

Your store listing can include a website URL, and you can link to the demo from your own site, social posts and ads. The listing itself isn't a place to embed a playable — use the link as the destination of your marketing instead.

### Is a custom domain required to publish on Google Play?

No. A domain is about branding and marketing. Play needs your app bundle, store assets and a privacy policy URL — which can live on any page you control.

### Should testers use the mobile browser or an APK?

Use the browser link for quick, broad feedback, and an APK for device testing where touch feel, performance and first-launch behaviour matter. For Google's testing requirement, testers must install through the Play testing track.

Publish a playable, point a domain at it if you're on Pro, and make "try it" the first thing people can do: [build your game on Pixelfork](https://pixelfork.ai).
`,
};

export default post;
