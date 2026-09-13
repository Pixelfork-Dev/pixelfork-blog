---
title: "Build a Responsive 2D Platformer Character Controller"
excerpt: "Code a tight 2D platformer controller with acceleration, variable jump height, coyote time and jump buffering, the tricks behind great game feel."
publishedAt: 2026-08-12
tags: [2d-game, tutorial]
author: pixelfork-team
cover:
  src: /images/posts/unity-beginners-guide.png
  alt: "Cover illustration: Exploring the Unity game engine, a beginner's guide, with a stone tower in a mountain valley"
  width: 1024
  height: 1024
---

Great platformers feel good because of small, invisible tricks. Let's build a controller that includes them.

## Acceleration, not instant speed

Instant movement feels stiff. Ease velocity toward the target speed instead:

```ts
const target = input.x * MAX_SPEED;
const rate = onGround ? GROUND_ACCEL : AIR_ACCEL;
velocity.x = moveTowards(velocity.x, target, rate * dt);
```

## Variable jump height

Let players control jump height by cutting upward velocity when they release the button early:

```ts
if (jumpReleased && velocity.y > 0) {
  velocity.y *= 0.5;
}
```

## Coyote time

Allow a jump for a few frames after walking off a ledge. Players believe they pressed jump in time, so let them.

```ts
coyoteTimer = onGround ? COYOTE_TIME : coyoteTimer - dt;
```

## Jump buffering

If the player presses jump slightly *before* landing, remember it and jump as soon as they touch the ground.

```ts
if (jumpPressed) bufferTimer = BUFFER_TIME;
else bufferTimer -= dt;

if (bufferTimer > 0 && coyoteTimer > 0) {
  velocity.y = JUMP_SPEED;
  bufferTimer = 0;
  coyoteTimer = 0;
}
```

## Heavier falling

Increase gravity when falling for a snappy arc:

```ts
const g = velocity.y < 0 ? GRAVITY * 1.8 : GRAVITY;
velocity.y -= g * dt;
```

Start with around 0.1 seconds for both coyote time and jump buffer, then tune by feel.
