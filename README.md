# koipond 🎏

[![ci](https://github.com/0xydev/koipond/actions/workflows/ci.yml/badge.svg)](https://github.com/0xydev/koipond/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

Turn your GitHub contribution graph into a living koi pond, seen from above.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/demo-dark.svg">
  <img alt="An animated koi pond generated from a GitHub contribution graph" src="assets/demo-light.svg">
</picture>

Your contributions become plankton: bigger and brighter the more you commit. Fish paths come from
a deterministic steering-force simulation (momentum, capped turning force, a gentle wander), and
each body is drawn as the fish's own trail: a dense run of translucent circles replaying the head's
path a beat later, with a grow-then-taper size profile and alpha fading toward the tail. In a turn
the body wraps the curve, because the body *is* the curve. Fish graze the year clean; when the pond
empties, night falls and the ecosystem regrows in a seamless loop. Every bite sends a ripple across
the water.

The graph does not just feed the fish, it shapes the ecosystem:

- **Fish count and species** (koi vs minnows) scale with your total contributions.
- **A 30+ day streak** earns a pond turtle paddling across. 🐢
- **A 21+ day quiet stretch** makes a lotus bloom over its center. 🪷
- **Dark mode is bioluminescent**: an abyssal pond, twinkling plankton, glowing spirit koi.

Everything is baked into a self-contained animated SVG (CSS keyframes, no JavaScript), so it works
anywhere GitHub renders images, including profile READMEs.

## Usage (GitHub Action)

Add a workflow to any repository you own (your profile repository is the usual spot). It
regenerates the pond every night and publishes the SVGs to an `output` branch:

```yaml
name: koipond
on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: 0xydev/koipond@v1
        with:
          github_user_name: ${{ github.repository_owner }}
          outputs: |
            dist/koipond-light.svg
            dist/koipond-dark.svg?theme=dark
      - uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Then embed the generated files in your README so the theme follows the viewer:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/<user>/<repo>/output/koipond-dark.svg">
  <img alt="koipond" src="https://raw.githubusercontent.com/<user>/<repo>/output/koipond-light.svg">
</picture>
```

Each `outputs` line accepts options as a query string:

| Option | Meaning |
| --- | --- |
| `theme` | `light` (default) or `dark` |
| `seed` | Any string, changes fish variety and routes (defaults to the username) |

## Quick start

```sh
git clone https://github.com/0xydev/koipond.git
cd koipond
npm install
npm run demo          # generates dist/koipond-{light,dark}.svg + dist/preview.html
```

Open `dist/preview.html` in a browser to watch both themes.

Generate your own pond (no token needed, works with any public profile):

```sh
npx tsx src/cli.ts --user <your-github-login>
```

With a token you get exact contribution counts instead of levels:

```sh
npx tsx src/cli.ts --user <login> --token <token>
```

| Flag | Meaning |
| --- | --- |
| `--user` | GitHub login to fetch the contribution calendar for |
| `--token` | GitHub token, falls back to `GITHUB_TOKEN` env (optional) |
| `--demo` | Use generated demo data instead of the API |
| `--seed` | Override the PRNG seed (defaults to the username) |
| `--theme` | `light`, `dark` or `both` (default `both`) |
| `--out` | Output directory (default `dist`) |

## How it works

1. **Data**: GitHub GraphQL `contributionCalendar`, the public contributions page (no token), or a
   deterministic demo generator.
2. **Planner** (`src/planner.ts`): a seeded steering-physics simulation. Fish accelerate under a
   capped force toward their next plankton, slow into the pickup, weave under a wander force and
   bounce softly off the walls. Deterministic, so the same grid + seed always bakes the same film.
3. **Renderer** (`src/render/svg.ts`): bakes the simulated paths into CSS `@keyframes` (decimated on
   straightaways), draws bodies as delayed trails, and quantizes eat times into 0.5% buckets so
   hundreds of plankton share ~100 keyframe blocks, keeping file size down.

## Roadmap

- [x] Steering-physics fish over the contribution field, light and dark themes
- [x] GitHub Action packaging (`uses: 0xydev/koipond@v1`) with query-string options
- [ ] GIF output (headless browser capture)
- [ ] More species, decor unlocked by achievements, GitLab support

## Contributing

Contributions are welcome! Feel free to open an issue for bugs and ideas, or send a PR directly.
To get started:

```sh
npm install
npm run demo          # see your changes in dist/preview.html
npm run typecheck
npm test
```

New species, decor, themes and achievement rules are all good first issues: species live in
`src/render/fish.ts`, decor in `src/render/decor.ts`, colors in `src/render/palette.ts`.

## License

[MIT](LICENSE)
