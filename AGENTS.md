# Repository Guidelines

## Project Structure & Module Organization

Angry IT is a browser-based physics arcade game built with TypeScript, Phaser 3, Matter Physics, and Vite.

- `src/main.ts` configures Phaser, scaling, physics, and scene registration.
- `src/game/scenes/` contains startup and gameplay scenes.
- `src/game/entities/` contains infrastructure blocks, the slingshot, and projectiles.
- `src/game/systems/` handles damage and projectile sequencing.
- `src/game/data/` defines projectile types and tower layouts; `src/game/constants.ts` centralizes shared tuning values.
- `src/game/rendering/ArtFactory.ts` generates game artwork at runtime.
- `src/styles/game.css` holds page styling; `public/` contains favicons.
- `.spec/PLAN.md` records the project plan. `dist/` is generated output; do not edit it directly.

## Build, Test, and Development Commands

- `npm install`: install dependencies from the package manifest and lockfile.
- `npm run dev`: start Vite on port 5173, listening on all interfaces.
- `npm run typecheck`: run strict TypeScript checking without emitting files.
- `npm run build`: typecheck and generate the production bundle in `dist/`.
- `npm run preview`: serve the production build for local verification.

## Coding Style & Naming Conventions

Use TypeScript ES modules, two-space indentation, and semicolons. Follow the surrounding file's quote style; existing files use both single and double quotes. Use PascalCase for classes and their filenames, camelCase for methods and variables, and UPPER_SNAKE_CASE for shared constants. Keep gameplay data, rendering, entities, and systems in their existing layers. No formatter or linter is currently configured.

## Testing Guidelines

There is no automated test runner or coverage threshold configured. Run `npm run typecheck` and `npm run build` before submitting changes. For gameplay changes, manually verify mouse and touch aiming, trajectory preview, projectile cycling and special effects, collisions, and restarting through both `RESTART` and `R`. Check responsive scaling and the browser console for errors.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Fix restart` and `Humanize vulnerabilities`; follow that style and keep commits focused. Pull requests should explain the change, list validation performed, link relevant issues, and include screenshots or a short recording for visual or gameplay changes. Do not commit generated bundles, dependencies, or local browser artifacts.
