---
title: "Ad Mediation Explained for Game Developers"
excerpt: "What ad mediation is, how waterfalls and in-app bidding work, and how to set up mediation to raise ad revenue in your mobile game."
publishedAt: 2026-08-17
tags: [monetization]
author: pixelfork-team
cover:
  src: /images/posts/unity-beginners-guide.png
  alt: "Cover illustration: Exploring the Unity game engine, a beginner's guide, with a stone tower in a mountain valley"
  width: 1024
  height: 1024
---

If your game shows ads, mediation is one of the biggest levers for revenue. Here's how it works.

## What is ad mediation?

An **ad mediation platform** connects your game to many ad networks at once. Each time you can show an ad, the networks compete to fill it, so you earn more than you would with a single network.

## Waterfall vs. bidding

### Waterfall

Networks are called one after another in an order based on historical eCPM. It's simple but slow, and the order quickly becomes out of date.

### In-app bidding

All networks bid **at the same time** in a real-time auction, and the highest bid wins. Bidding usually raises revenue and cuts down on manual tuning.

Most modern setups are **hybrid**: bidding networks compete first, with a short waterfall as a fallback.

## Key metrics

| Metric | Meaning |
| --- | --- |
| eCPM | Revenue per 1,000 impressions |
| Fill rate | Share of ad requests that return an ad |
| ARPDAU | Average revenue per daily active user |

## Setup tips

- Start with 3–5 quality networks. More isn't always better.
- Keep SDKs updated. Old versions often lose bids.
- Test ad placements with A/B experiments, and watch retention alongside revenue.
