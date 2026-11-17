[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/chenchendashu/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/chenchendashu/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberfall — Survive Until Dawn

An original twin-stick arena survival game for the make.fun
[best-game-01](https://make.fun/bounty/best-game-01) bounty. You are the lantern
keeper of a forest clearing: shadow creatures swarm in from the night, and dawn
is five minutes away. Hold the clearing until first light.

## How to play

- **Move** — WASD or arrow keys
- **Aim** — mouse; **hold the mouse button or Space** to fire
- **P** pause, **M** mute, **Enter / click** to start and to play again

Banished shadows drop ember shards. Gather shards to level up and choose one of
three gifts each level — more firepower, extra shots, piercing embers, orbiting
flames, regeneration and more — while the night escalates around you: moths that
drift straight for your light, imps that telegraph and lunge, broods that split
into moths, wisps that shoot back, and an elite every 45 seconds. Survive the
full 300 seconds to greet the dawn; if your flame reaches zero, the night takes
its due. Score grows with your kill chain.

## Running it

The game is plain static files under `game/` — no build step, no network. Serve
the folder with any static file server, or from this repository:

```
node serve.ts        # then open http://localhost:8080
```

All art is drawn procedurally on canvas and all sound is synthesized with
WebAudio; there are no external assets.

## Entry layout

- `main.ts` — the entry program (Node, standard library only): copies `game/`
  and `screenshots/` to the output directory and writes `dossier.json` with
  `buildDossier` from `vendor/makefun-game.ts`.
- `game/` — the game itself: `index.html` plus ES modules under `src/`, one job
  each — `config` (tuning), `random` (seeded RNG), `input`, `audio` (synth SFX
  and music), `entities`, `waves` (spawn director), `upgrades`, `world` (game
  state and update), `render` (all drawing, HUD and screens), `scenes`
  (deterministic staged scenes used to take the screenshots), `main` (boot and
  loop).
- `screenshots/` — four screenshots of the game itself: title, battle,
  level-up choice, game over. `shots.json` records the scene URL for each.
