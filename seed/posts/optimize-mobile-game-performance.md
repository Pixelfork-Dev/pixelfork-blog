---
title: "Optimizing Mobile Game Performance: A Practical Checklist"
excerpt: "Keep your mobile game at a smooth frame rate and low battery drain with this checklist for draw calls, textures, memory, physics and profiling."
publishedAt: 2026-08-25
tags: [mobile-game-dev, pro-tips]
author: pixelfork-team
cover:
  src: /images/posts/unity-beginners-guide.png
  alt: "Cover illustration: Exploring the Unity game engine, a beginner's guide, with a stone tower in a mountain valley"
  width: 1024
  height: 1024
---

Phones throttle when they get hot, and players uninstall games that stutter. Use this checklist to find and fix the most common performance problems.

## Profile first

Never guess. Profile on a **real, mid-range device**, not only in the editor. Look for spikes in CPU time, GPU time and garbage collection.

## Rendering

- **Batch draw calls.** Share materials and use texture atlases.
- **Compress textures** with ASTC or ETC2 and use mipmaps for 3D.
- **Avoid overdraw.** Large transparent particles and full-screen UI layers are expensive.
- **Bake lighting** wherever you can instead of using real-time shadows.

## CPU and memory

- **Pool objects** such as bullets and enemies instead of creating and destroying them.
- **Avoid allocations in update loops.** They trigger garbage collection pauses.
- **Reduce physics cost** with simple colliders and a lower fixed timestep.

## Battery and heat

- Target **30 FPS** for slower-paced games and 60 FPS for action games.
- Lower the frame rate on menus and pause screens.
- Render at a lower resolution and scale up on very high-DPI screens.

## Loading and size

- Stream or lazy-load levels.
- Strip unused assets and code.
- Keep the install size small. Smaller downloads convert better on app stores.
