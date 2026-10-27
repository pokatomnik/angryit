# Angry IT

A browser-based physics arcade game: launch vulnerabilities from a slingshot at a tower of digital infrastructure and bring it down.

## Getting Started

```sh
npm install
npm run dev
```

Open the URL printed by Vite (by default, `http://localhost:5173`).

## Controls

- Drag the projectile back from the slingshot using your mouse or finger.
- Release to launch it. The dotted line shows the approximate trajectory.
- Projectiles are unlimited and cycle through `mr. 0-day` → `Spectre` → `Ransomware`.
- Click `RESTART` or press `R` to restart the level.

`Spectre` sends out a shockwave that damages blocks around the impact point, `Ransomware` infects and damages nearby blocks, and `mr. 0-day` deals heavy direct damage.

## Validation

```sh
npm run typecheck
npm run build
```

## Tech Stack

TypeScript, Phaser 3, Matter.js (via Phaser Matter Physics), and Vite. Artwork is generated at startup using Phaser Graphics; no external art assets are required.
