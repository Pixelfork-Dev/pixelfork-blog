---
title: "Build Your First Browser Game with Three.js"
excerpt: "Set up a Three.js scene, add a camera, lights and a player object, and write a render loop that turns it into a small playable 3D browser game."
publishedAt: 2026-09-08
tags: [threejs, tutorial, 3d-game]
featured: true
author: pixelfork-team
cover:
  src: /images/posts/unity-beginners-guide.png
  alt: "Cover illustration: Exploring the Unity game engine, a beginner's guide, with a stone tower in a mountain valley"
  width: 1024
  height: 1024
---

Three.js makes WebGL approachable. With a scene, a camera and a render loop, you can have a 3D game running in any modern browser in under a hundred lines.

## The three essentials

Every Three.js app needs a **scene**, a **camera** and a **renderer**:

```js
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
```

## Add light and a player

```js
scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 2));

const player = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xf26207 })
);
scene.add(player);
```

## Input and the game loop

```js
const keys = new Set();
addEventListener("keydown", (e) => keys.add(e.key));
addEventListener("keyup", (e) => keys.delete(e.key));

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  const speed = 5 * dt;
  if (keys.has("ArrowLeft")) player.position.x -= speed;
  if (keys.has("ArrowRight")) player.position.x += speed;
  renderer.render(scene, camera);
});
```

`setAnimationLoop` syncs with the display refresh rate, and `clock.getDelta()` keeps movement independent of frame rate.

## Handle resizing

```js
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
```

## Next steps

- Load real models with `GLTFLoader`.
- Add collisions with a physics library such as Rapier.
- Cap the renderer pixel ratio at 2 so it stays fast on high-DPI phones.
